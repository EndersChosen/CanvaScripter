/**
 * QTI Analyzer
 * Analyzes QTI (Question and Test Interoperability) files for Canvas compatibility
 * Supports QTI 1.2 and QTI 2.1 formats (XML files and ZIP packages)
 */

const { XMLParser, XMLValidator } = require('fast-xml-parser');
const JSZip = require('jszip');

/**
 * QTI Parser - Handles XML parsing and version detection
 */
class QTIParser {
    constructor(xmlContent, options = {}) {
        this.rawXml = xmlContent;
        this.options = options;
        this.version = null;
        this.parsedData = null;
        this.errors = [];
    }

    parse() {
        try {
            // Validate XML structure
            const validation = XMLValidator.validate(this.rawXml, {
                allowBooleanAttributes: true
            });

            if (validation !== true) {
                this.errors.push({
                    type: 'xml_validation',
                    message: 'Invalid XML structure',
                    details: validation.err
                });
                throw new Error('Invalid XML: ' + validation.err.msg);
            }

            // Detect QTI version
            this.version = this.detectQTIVersion();

            // Parse XML to JSON
            this.parsedData = this.parseXmlToJson();

            return {
                version: this.version,
                data: this.parsedData,
                errors: this.errors,
                success: true,
                rawXml: this.rawXml
            };
        } catch (error) {
            this.errors.push({
                type: 'parsing_error',
                message: error.message
            });
            return {
                version: null,
                data: null,
                errors: this.errors,
                success: false,
                rawXml: this.rawXml
            };
        }
    }

    detectQTIVersion() {
        // QTI 1.2 indicators
        if (this.rawXml.includes('questestinterop') ||
            this.rawXml.includes('ims_qtiasiv1p2') ||
            this.rawXml.includes('//www.imsglobal.org/xsd/ims_qtiasiv1p2')) {
            return '1.2';
        }

        // QTI 2.1 indicators
        if (this.rawXml.includes('assessmentTest') ||
            this.rawXml.includes('assessmentItem') ||
            this.rawXml.includes('imsqti_v2p1') ||
            this.rawXml.includes('//www.imsglobal.org/xsd/imsqti_v2p1')) {
            return '2.1';
        }

        // Default to 2.1 if unclear
        return '2.1';
    }

    parseXmlToJson() {
        const parserOptions = {
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text',
            parseAttributeValue: true,
            trimValues: true,
            parseTagValue: true,
            isArray: (name, jpath, isLeafNode, isAttribute) => {
                // Ensure certain elements are always arrays
                const arrayElements = ['item', 'section', 'assessmentItem', 'choice', 'simpleChoice', 'interaction'];
                return arrayElements.includes(name);
            }
        };

        const parser = new XMLParser(parserOptions);
        return parser.parse(this.rawXml);
    }
}

/**
 * QTI Package Extractor - Handles ZIP package extraction
 */
class QTIPackageExtractor {
    constructor(zipBuffer) {
        this.zipBuffer = zipBuffer;
        this.manifest = null;
        this.assessmentFiles = [];
    }

    async extract() {
        try {
            const zip = await JSZip.loadAsync(this.zipBuffer);

            // Find and parse imsmanifest.xml
            const manifestFile = zip.file('imsmanifest.xml');
            if (manifestFile) {
                const manifestContent = await manifestFile.async('string');
                this.manifest = this.parseManifest(manifestContent);
            }

            // Extract all .xml files that look like QTI files
            const filePromises = [];
            zip.forEach((relativePath, file) => {
                if (relativePath.endsWith('.xml') && relativePath !== 'imsmanifest.xml') {
                    filePromises.push(
                        file.async('string').then(content => {
                            if (this.isQTIFile(content)) {
                                return {
                                    filename: relativePath,
                                    content: content
                                };
                            }
                            return null;
                        })
                    );
                }
            });

            const files = await Promise.all(filePromises);
            this.assessmentFiles = files.filter(f => f !== null);

            return {
                manifest: this.manifest,
                assessmentFiles: this.assessmentFiles,
                fileCount: this.assessmentFiles.length
            };
        } catch (error) {
            throw new Error(`Failed to extract ZIP package: ${error.message}`);
        }
    }

    isQTIFile(xmlContent) {
        return xmlContent.includes('<questestinterop') ||
            xmlContent.includes('<assessmentTest') ||
            xmlContent.includes('<assessmentItem') ||
            xmlContent.includes('imsqti');
    }

    parseManifest(xmlContent) {
        try {
            const parser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: '@_'
            });
            return parser.parse(xmlContent);
        } catch (error) {
            return null;
        }
    }

    /**
     * Extract a map of assessment filename -> resource identifier from the manifest.
     * Used to verify that imsmanifest.xml resource identifiers match the assessment
     * ident attributes inside each quiz XML file.
     */
    getResourceIdentifierMap() {
        if (!this.manifest) return {};

        const map = {};
        try {
            const manifestRoot = this.manifest.manifest || this.manifest;
            const resources = manifestRoot?.resources;
            if (!resources) return map;

            const resourceList = Array.isArray(resources.resource)
                ? resources.resource
                : resources.resource ? [resources.resource] : [];

            resourceList.forEach(resource => {
                const identifier = resource['@_identifier'];
                const href = resource['@_href'];
                if (identifier && href) {
                    const normalizedHref = href.replace(/\\/g, '/').trim();
                    map[normalizedHref.toLowerCase()] = {
                        identifier,
                        href: normalizedHref,
                        type: resource['@_type'] || ''
                    };
                }
            });
        } catch (e) {
            // Failed to extract resource identifiers from manifest
        }

        return map;
    }
}

/**
 * QTI Validator - Validates QTI structure and content
 */
class QTIValidator {
    constructor(version, parsedData) {
        this.version = version;
        this.data = parsedData;
        this.errors = [];
        this.warnings = [];
    }

    validate() {
        // Check for required elements based on version
        if (this.version === '1.2') {
            this.validateQTI12();
        } else {
            this.validateQTI21();
        }

        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    validateQTI12() {
        // Check for questestinterop root
        if (!this.data.questestinterop) {
            this.errors.push({
                element: 'root',
                message: 'Missing questestinterop root element for QTI 1.2'
            });
        }
    }

    validateQTI21() {
        // Check for assessmentTest or assessmentItem
        if (!this.data.assessmentTest && !this.data.assessmentItem) {
            this.errors.push({
                element: 'root',
                message: 'Missing assessmentTest or assessmentItem root element for QTI 2.1'
            });
        }
    }

    addWarning(element, message) {
        this.warnings.push({ element, message });
    }

    addError(element, message) {
        this.errors.push({ element, message });
    }
}

/**
 * Main QTI Analyzer Class
 */
class QTIAnalyzer {
    constructor(qtiData, options = {}) {
        this.data = qtiData.data;
        this.version = qtiData.version;
        this.rawData = qtiData;
        this.rawXml = qtiData.rawXml || '';
        this.options = options;
    }

    /**
     * Generate comprehensive analysis report
     */
    generateReport() {
        const report = {
            version: this.version,
            metadata: this.getMetadata(),
            validation: this.getValidationResults(),
            questionSummary: this.getQuestionSummary(),
            interactionTypes: this.getInteractionTypes(),
            scoringAnalysis: this.getScoringAnalysis(),
            canvasCompatibility: this.checkCanvasCompatibility(),
            contentAnalysis: this.analyzeContent(),
            mediaAnalysis: this.analyzeMediaReferences(),
            canvasImportReadiness: this.checkCanvasImportReadiness(),
            warnings: this.getWarnings()
        };

        // Integrate import readiness issues into compatibility score
        const readiness = report.canvasImportReadiness;
        if (readiness && readiness.issues.length > 0) {
            readiness.issues.forEach(issue => {
                if (issue.severity === 'high') {
                    report.canvasCompatibility.score = Math.max(0, report.canvasCompatibility.score - 15);
                } else if (issue.severity === 'medium') {
                    report.canvasCompatibility.score = Math.max(0, report.canvasCompatibility.score - 5);
                }
            });

            // Add summary issue to compatibility
            const highCount = readiness.issues.filter(i => i.severity === 'high').length;
            if (highCount > 0) {
                report.canvasCompatibility.issues.push({
                    severity: 'high',
                    type: 'canvas_import_readiness',
                    message: `${highCount} Canvas import readiness issue${highCount > 1 ? 's' : ''} found (missing namespace, metadata, etc.)`,
                    impact: 'These issues will likely cause import failures or incorrect question type mapping in Canvas'
                });
                report.canvasCompatibility.compatible = false;
                report.canvasCompatibility.recommendations = report.canvasCompatibility.recommendations.filter(
                    r => r !== 'File appears compatible with Canvas - ready for import'
                );
                report.canvasCompatibility.recommendations.push(
                    'Use the "Fix Canvas Compatibility" button to automatically resolve structural issues'
                );
            }
        }

        return report;
    }

    /**
     * Extract metadata from QTI file
     */
    getMetadata() {
        const metadata = {
            title: null,
            description: null,
            version: this.version,
            identifier: null,
            author: null,
            creationDate: null,
            questionCount: 0
        };

        try {
            if (this.version === '1.2') {
                const qti = this.data.questestinterop;
                if (qti) {
                    // Extract from assessment or item
                    const assessment = qti.assessment || qti.item;
                    if (assessment) {
                        metadata.identifier = assessment['@_ident'] || assessment['@_identifier'];
                        metadata.title = assessment['@_title'] || this.extractTitle12(assessment);

                        // Count items
                        metadata.questionCount = this.countItems12(qti);
                    }
                }
            } else {
                // QTI 2.1
                const test = this.data.assessmentTest || this.data.assessmentItem;
                if (test) {
                    metadata.identifier = test['@_identifier'];
                    metadata.title = test['@_title'];
                    metadata.questionCount = this.countItems21(test);
                }
            }
        } catch (error) {
            // Metadata extraction failed, continue with defaults
        }

        return metadata;
    }

    extractTitle12(assessment) {
        // Try to find title in metadata
        if (assessment.qtimetadata) {
            const metadata = Array.isArray(assessment.qtimetadata) ? assessment.qtimetadata[0] : assessment.qtimetadata;
            if (metadata.qtimetadatafield) {
                const fields = Array.isArray(metadata.qtimetadatafield) ? metadata.qtimetadatafield : [metadata.qtimetadatafield];
                const titleField = fields.find(f => f.fieldlabel === 'qmd_title' || f.fieldlabel === 'title');
                if (titleField && titleField.fieldentry) {
                    return titleField.fieldentry;
                }
            }
        }
        return null;
    }

    countItems12(qti) {
        let count = 0;
        if (qti.item) {
            count = Array.isArray(qti.item) ? qti.item.length : 1;
        }
        if (qti.assessment && qti.assessment.section) {
            const sections = Array.isArray(qti.assessment.section) ? qti.assessment.section : [qti.assessment.section];
            sections.forEach(section => {
                if (section.item) {
                    count += Array.isArray(section.item) ? section.item.length : 1;
                }
            });
        }
        return count;
    }

    countItems21(test) {
        let count = 0;

        // If this is an assessmentItem, count is 1
        if (this.data.assessmentItem) {
            return 1;
        }

        // Count assessmentItemRef in assessmentTest
        if (test.testPart) {
            const testParts = Array.isArray(test.testPart) ? test.testPart : [test.testPart];
            testParts.forEach(part => {
                if (part.assessmentSection) {
                    const sections = Array.isArray(part.assessmentSection) ? part.assessmentSection : [part.assessmentSection];
                    sections.forEach(section => {
                        count += this.countItemsInSection21(section);
                    });
                }
            });
        }

        return count;
    }

    countItemsInSection21(section) {
        let count = 0;
        if (section.assessmentItemRef) {
            count += Array.isArray(section.assessmentItemRef) ? section.assessmentItemRef.length : 1;
        }
        if (section.assessmentSection) {
            const subsections = Array.isArray(section.assessmentSection) ? section.assessmentSection : [section.assessmentSection];
            subsections.forEach(sub => {
                count += this.countItemsInSection21(sub);
            });
        }
        return count;
    }

    /**
     * Get validation results
     */
    getValidationResults() {
        const validator = new QTIValidator(this.version, this.data);
        const result = validator.validate();

        return {
            valid: result.valid,
            errors: result.errors,
            warnings: result.warnings,
            wellFormed: this.rawData.success
        };
    }

    /**
     * Analyze question types and breakdown
     */
    getQuestionSummary() {
        const questions = this.extractAllQuestions();
        const summary = {
            total: questions.length,
            byType: {},
            byPoints: {
                '0': 0,
                '1-5': 0,
                '6-10': 0,
                '11+': 0
            },
            withFeedback: 0,
            withMedia: 0
        };

        questions.forEach(q => {
            // Count by type
            const type = q.type || 'unknown';
            summary.byType[type] = (summary.byType[type] || 0) + 1;

            // Count by points
            const points = q.points || 0;
            if (points === 0) summary.byPoints['0']++;
            else if (points <= 5) summary.byPoints['1-5']++;
            else if (points <= 10) summary.byPoints['6-10']++;
            else summary.byPoints['11+']++;

            // Count features
            if (q.hasFeedback) summary.withFeedback++;
            if (q.hasMedia) summary.withMedia++;
        });

        return summary;
    }

    extractAllQuestions() {
        const questions = [];

        if (this.version === '1.2') {
            this.extractQuestions12(this.data.questestinterop, questions);
        } else {
            this.extractQuestions21(this.data, questions);
        }

        return questions;
    }

    extractQuestions12(qti, questions) {
        if (!qti) return;

        // Extract direct items
        if (qti.item) {
            const items = Array.isArray(qti.item) ? qti.item : [qti.item];
            items.forEach(item => {
                questions.push(this.parseItem12(item));
            });
        }

        // Extract items from assessment sections
        if (qti.assessment && qti.assessment.section) {
            const sections = Array.isArray(qti.assessment.section) ? qti.assessment.section : [qti.assessment.section];
            sections.forEach(section => {
                if (section.item) {
                    const items = Array.isArray(section.item) ? section.item : [section.item];
                    items.forEach(item => {
                        questions.push(this.parseItem12(item));
                    });
                }
            });
        }
    }

    parseItem12(item) {
        return {
            id: item['@_ident'],
            title: item['@_title'],
            type: this.detectQuestionType12(item),
            points: this.extractPoints12(item),
            hasFeedback: this.hasFeedback12(item),
            hasMedia: this.hasMedia(JSON.stringify(item))
        };
    }

    detectQuestionType12(item) {
        const metadataType = this.getQuestionTypeFromMetadata12(item);
        if (metadataType) {
            return metadataType;
        }

        // Check response types
        const presentation = item.presentation;
        if (!presentation) return 'unknown';

        if (presentation.response_lid) {
            const responseLid = Array.isArray(presentation.response_lid) ? presentation.response_lid[0] : presentation.response_lid;
            const cardinality = String(responseLid?.['@_rcardinality'] || '').toLowerCase();

            if (this.isTrueFalseResponse12(responseLid)) return 'True/False';
            if (cardinality === 'multiple') return 'Multiple Answers';
            return 'Multiple Choice';
        }
        if (presentation.response_str) return 'Fill in Blank';
        if (presentation.response_num) return 'Numerical';
        if (presentation.response_xy) return 'Hotspot';
        if (presentation.response_grp) return 'Matching';

        if (presentation.material && !presentation.response_lid && !presentation.response_str && !presentation.response_num && !presentation.response_xy && !presentation.response_grp) {
            return 'Stimulus';
        }

        return 'unknown';
    }

    getQuestionTypeFromMetadata12(item) {
        const metadataFields = this.extractMetadataFields12(item);
        if (metadataFields.length === 0) {
            return null;
        }

        const typeField = metadataFields.find(field => {
            const label = String(field.fieldlabel || '').toLowerCase();
            return label === 'question_type' || label === 'qmd_question_type' || label === 'cc_profile';
        });

        if (!typeField || !typeField.fieldentry) {
            return null;
        }

        return this.normalizeQuestionType(typeField.fieldentry);
    }

    extractMetadataFields12(item) {
        const fields = [];

        const normalizeValue = (value) => {
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                return String(value);
            }
            if (typeof value === 'object') {
                if (value['#text'] !== undefined) {
                    return normalizeValue(value['#text']);
                }
                if (value.fieldentry !== undefined) {
                    return normalizeValue(value.fieldentry);
                }
            }
            return '';
        };

        const visit = (node) => {
            if (!node || typeof node !== 'object') return;

            if (node.qtimetadatafield) {
                const qtiFields = Array.isArray(node.qtimetadatafield) ? node.qtimetadatafield : [node.qtimetadatafield];
                qtiFields.forEach(field => {
                    fields.push({
                        fieldlabel: normalizeValue(field.fieldlabel).trim(),
                        fieldentry: normalizeValue(field.fieldentry).trim()
                    });
                });
            }

            Object.values(node).forEach(child => {
                if (Array.isArray(child)) {
                    child.forEach(visit);
                } else if (child && typeof child === 'object') {
                    visit(child);
                }
            });
        };

        visit(item);
        return fields;
    }

    normalizeQuestionType(rawType) {
        if (!rawType) return 'unknown';

        const normalized = String(rawType).trim().toLowerCase();
        const typeMap = {
            'multiple_choice_question': 'Multiple Choice',
            'multiple_answers_question': 'Multiple Answers',
            'true_false_question': 'True/False',
            'short_answer_question': 'Short Answer',
            'essay_question': 'Essay',
            'file_upload_question': 'File Upload',
            'matching_question': 'Matching',
            'numerical_question': 'Numerical',
            'calculated_question': 'Formula',
            'formula_question': 'Formula',
            'fill_in_multiple_blanks_question': 'Fill in Multiple Blanks',
            'multiple_dropdowns_question': 'Multiple Dropdowns',
            'categorization_question': 'Categorization',
            'hot_spot_question': 'Hotspot',
            'hotspot_question': 'Hotspot',
            'text_only_question': 'Stimulus',
            'stimulus_question': 'Stimulus',
            'ordering_question': 'Ordering'
        };

        return typeMap[normalized] || rawType;
    }

    isTrueFalseResponse12(responseLid) {
        if (!responseLid) return false;

        const labels = [];
        const collectLabels = (node) => {
            if (!node || typeof node !== 'object') return;
            if (node['@_ident']) {
                labels.push(String(node['@_ident']).toLowerCase());
            }
            Object.values(node).forEach(child => {
                if (Array.isArray(child)) {
                    child.forEach(collectLabels);
                } else if (child && typeof child === 'object') {
                    collectLabels(child);
                }
            });
        };

        collectLabels(responseLid.render_choice || responseLid);

        if (labels.length !== 2) return false;
        const labelSet = new Set(labels);

        const trueFalsePairs = [
            ['true', 'false'],
            ['t', 'f'],
            ['yes', 'no'],
            ['1', '0']
        ];

        return trueFalsePairs.some(pair => labelSet.has(pair[0]) && labelSet.has(pair[1]));
    }

    extractPoints12(item) {
        // Try to find in resprocessing
        if (item.resprocessing && item.resprocessing.outcomes && item.resprocessing.outcomes.decvar) {
            const decvar = item.resprocessing.outcomes.decvar;
            if (decvar['@_maxvalue']) {
                return parseFloat(decvar['@_maxvalue']) || 1;
            }
        }
        return 1; // default
    }

    hasFeedback12(item) {
        return !!(item.itemfeedback || (item.resprocessing && item.resprocessing.respcondition));
    }

    extractQuestions21(data, questions) {
        // If this is a single assessment item
        if (data.assessmentItem) {
            questions.push(this.parseItem21(data.assessmentItem));
            return;
        }

        // Extract from assessment test
        const test = data.assessmentTest;
        if (test && test.testPart) {
            // Note: In QTI 2.1, items are referenced, not embedded
            // We can only count references here
            const testParts = Array.isArray(test.testPart) ? test.testPart : [test.testPart];
            testParts.forEach(part => {
                if (part.assessmentSection) {
                    const sections = Array.isArray(part.assessmentSection) ? part.assessmentSection : [part.assessmentSection];
                    sections.forEach(section => {
                        this.extractItemRefs21(section, questions);
                    });
                }
            });
        }
    }

    extractItemRefs21(section, questions) {
        if (section.assessmentItemRef) {
            const refs = Array.isArray(section.assessmentItemRef) ? section.assessmentItemRef : [section.assessmentItemRef];
            refs.forEach(ref => {
                questions.push({
                    id: ref['@_identifier'],
                    href: ref['@_href'],
                    type: 'Referenced Item',
                    points: 1,
                    hasFeedback: false,
                    hasMedia: false
                });
            });
        }

        if (section.assessmentSection) {
            const subsections = Array.isArray(section.assessmentSection) ? section.assessmentSection : [section.assessmentSection];
            subsections.forEach(sub => {
                this.extractItemRefs21(sub, questions);
            });
        }
    }

    parseItem21(item) {
        return {
            id: item['@_identifier'],
            title: item['@_title'],
            type: this.detectQuestionType21(item),
            points: this.extractPoints21(item),
            hasFeedback: this.hasFeedback21(item),
            hasMedia: this.hasMedia(JSON.stringify(item))
        };
    }

    detectQuestionType21(item) {
        const body = item.itemBody;
        if (!body) return 'unknown';

        // Check for interaction types
        const bodyStr = JSON.stringify(body);
        if (bodyStr.includes('choiceInteraction')) return 'Multiple Choice';
        if (bodyStr.includes('textEntryInteraction')) return 'Fill in Blank';
        if (bodyStr.includes('extendedTextInteraction')) return 'Essay';
        if (bodyStr.includes('matchInteraction')) return 'Matching';
        if (bodyStr.includes('associateInteraction')) return 'Matching';
        if (bodyStr.includes('hotspotInteraction')) return 'Hotspot';
        if (bodyStr.includes('orderInteraction')) return 'Ordering';
        if (bodyStr.includes('inlineChoiceInteraction')) return 'Inline Choice';

        return 'unknown';
    }

    extractPoints21(item) {
        // QTI 2.1 may not embed scoring in items
        return 1; // default
    }

    hasFeedback21(item) {
        return !!(item.modalFeedback || (item.responseProcessing && JSON.stringify(item.responseProcessing).includes('feedback')));
    }

    hasMedia(content) {
        return content.includes('<img') ||
            content.includes('<audio') ||
            content.includes('<video') ||
            content.includes('matimage') ||
            content.includes('mataudio') ||
            content.includes('matvideo');
    }

    /**
     * Analyze interaction types
     */
    getInteractionTypes() {
        const interactions = {};
        const questions = this.extractAllQuestions();

        questions.forEach(q => {
            const type = q.type;
            if (!interactions[type]) {
                interactions[type] = {
                    count: 0,
                    canvasSupported: this.isCanvasSupportedType(type)
                };
            }
            interactions[type].count++;
        });

        return {
            total: questions.length,
            types: interactions
        };
    }

    isCanvasSupportedType(type) {
        const supported = [
            'Multiple Choice',
            'True/False',
            'Fill in Blank',
            'Fill in Multiple Blanks',
            'Multiple Dropdowns',
            'Short Answer',
            'Essay',
            'Matching',
            'Multiple Answers',
            'Numerical',
            'Calculated',
            'Formula'
        ];
        const limited = ['Hotspot', 'File Upload', 'Stimulus'];
        const newQuizzesOnly = ['Categorization', 'Ordering'];

        if (supported.includes(type)) return 'full';
        if (limited.includes(type)) return 'limited';
        if (newQuizzesOnly.includes(type)) return 'new_quizzes_only';
        return 'unsupported';
    }

    /**
     * Analyze scoring
     */
    getScoringAnalysis() {
        const questions = this.extractAllQuestions();
        const points = questions.map(q => q.points || 1);

        return {
            totalPoints: points.reduce((a, b) => a + b, 0),
            averagePoints: points.length > 0 ? points.reduce((a, b) => a + b, 0) / points.length : 0,
            minPoints: points.length > 0 ? Math.min(...points) : 0,
            maxPoints: points.length > 0 ? Math.max(...points) : 0,
            pointDistribution: this.calculateDistribution(points)
        };
    }

    calculateDistribution(points) {
        const dist = {};
        points.forEach(p => {
            dist[p] = (dist[p] || 0) + 1;
        });
        return dist;
    }

    /**
     * Check Canvas compatibility
     */
    checkCanvasCompatibility() {
        const issues = [];
        const warnings = [];

        // Check version
        if (this.version === '1.2') {
            warnings.push({
                severity: 'medium',
                type: 'qti_version',
                message: 'QTI 1.2 has limited Canvas support. Consider upgrading to QTI 2.1 for better compatibility.',
                impact: 'Some features may not import correctly'
            });
        }

        // Check interaction types
        const interactions = this.getInteractionTypes();
        Object.entries(interactions.types).forEach(([type, data]) => {
            if (data.canvasSupported === 'unsupported') {
                issues.push({
                    severity: 'high',
                    type: 'unsupported_interaction',
                    message: `Unsupported interaction type: ${type} (${data.count} question${data.count > 1 ? 's' : ''})`,
                    impact: 'These questions may not import correctly into Canvas'
                });
            } else if (data.canvasSupported === 'limited') {
                warnings.push({
                    severity: 'medium',
                    type: 'limited_interaction',
                    message: `Limited support for ${type} (${data.count} question${data.count > 1 ? 's' : ''})`,
                    impact: 'These questions may require manual review after import'
                });
            } else if (data.canvasSupported === 'new_quizzes_only') {
                warnings.push({
                    severity: 'medium',
                    type: 'new_quizzes_only_interaction',
                    message: `${type} (${data.count} question${data.count > 1 ? 's' : ''}) is supported in Canvas New Quizzes only`,
                    impact: 'These questions are not supported in Classic Quizzes'
                });
            }
        });

        // Check for media
        const content = this.analyzeContent();
        if (content.hasExternalLinks) {
            const linkList = content.externalLinks.slice(0, 10);
            const moreCount = content.externalLinks.length - linkList.length;
            const linkSummary = linkList.join(', ') + (moreCount > 0 ? ` and ${moreCount} more` : '');
            warnings.push({
                severity: 'medium',
                type: 'external_references',
                message: `${content.externalLinks.length} external reference${content.externalLinks.length > 1 ? 's' : ''} detected: ${linkSummary}`,
                impact: 'Media files may need manual upload to Canvas'
            });
        }

        const mediaAnalysis = this.analyzeMediaReferences();
        if (mediaAnalysis.missing > 0) {
            warnings.push({
                severity: 'high',
                type: 'missing_media_references',
                message: `${mediaAnalysis.missing} media reference${mediaAnalysis.missing > 1 ? 's are' : ' is'} missing from the package`,
                impact: 'Questions may import with broken media in Canvas'
            });
        }

        // Calculate compatibility score
        const score = this.calculateCompatibilityScore(issues, warnings);

        return {
            compatible: issues.length === 0,
            score: score,
            issues: issues,
            warnings: warnings,
            recommendations: this.generateRecommendations(issues, warnings)
        };
    }

    calculateCompatibilityScore(issues, warnings) {
        let score = 100;

        issues.forEach(issue => {
            if (issue.severity === 'high') score -= 20;
            else if (issue.severity === 'medium') score -= 10;
            else if (issue.severity === 'low') score -= 5;
        });

        warnings.forEach(warning => {
            if (warning.severity === 'high') score -= 10;
            else if (warning.severity === 'medium') score -= 5;
            else if (warning.severity === 'low') score -= 2;
        });

        return Math.max(0, score);
    }

    generateRecommendations(issues, warnings) {
        const recommendations = [];

        if (this.version === '1.2') {
            recommendations.push('Consider converting to QTI 2.1 for better Canvas compatibility');
        }

        if (issues.some(i => i.type === 'unsupported_interaction')) {
            recommendations.push('Review unsupported question types and consider converting to Canvas-supported formats');
        }

        if (warnings.some(w => w.type === 'external_references')) {
            recommendations.push('Prepare to manually upload media files referenced in questions');
        }

        if (warnings.some(w => w.type === 'missing_media_references')) {
            recommendations.push('Re-export the package or include all referenced media files before import');
        }

        if (recommendations.length === 0) {
            recommendations.push('File appears compatible with Canvas - ready for import');
        }

        return recommendations;
    }

    /**
     * Analyze content
     */
    analyzeContent() {
        const content = JSON.stringify(this.data);

        // Find external URLs but exclude XML namespace/schema URIs
        const externalLinks = this.findExternalLinks(content);

        return {
            hasImages: content.includes('<img') || content.includes('matimage'),
            hasAudio: content.includes('<audio') || content.includes('mataudio'),
            hasVideo: content.includes('<video') || content.includes('matvideo'),
            hasExternalLinks: externalLinks.length > 0,
            externalLinks: externalLinks,
            hasMath: content.includes('math>') || content.includes('mathml') || content.includes('latex'),
            hasTables: content.includes('<table'),
            hasFormattedText: content.includes('<p>') || content.includes('<div>')
        };
    }

    /**
     * Find genuine external links, excluding XML namespace/schema URIs
     */
    findExternalLinks(content) {
        const urlPattern = /https?:\/\/[^\s"'<>\\]+/g;
        const matches = content.match(urlPattern) || [];

        // Namespace/schema URI patterns to exclude
        const excludePatterns = [
            /^https?:\/\/(www\.)?imsglobal\.org\/xsd\//i,
            /^https?:\/\/(www\.)?imsglobal\.org\/profile\//i,
            /^https?:\/\/(www\.)?w3\.org\/(\d{4}\/)?\w+/i,
            /^https?:\/\/ltsc\.ieee\.org\/xsd\//i,
            /^https?:\/\/(www\.)?imsglobal\.org\/xsd/i,
            /\.xsd$/i
        ];

        const uniqueUrls = [...new Set(matches)];
        return uniqueUrls.filter(url => {
            return !excludePatterns.some(pattern => pattern.test(url));
        });
    }

    analyzeMediaReferences() {
        if (!this.rawXml || typeof this.rawXml !== 'string') {
            return {
                total: 0,
                internal: 0,
                resolved: 0,
                missing: 0,
                external: 0,
                unknown: 0,
                references: []
            };
        }

        const referenceMatches = [
            ...[...this.rawXml.matchAll(/<(?:matimage|mataudio|matvideo)[^>]*\suri="([^"]+)"/g)].map(match => ({
                reference: match[1],
                source: 'qti_material'
            })),
            ...[...this.rawXml.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => ({
                reference: match[1],
                source: 'html_attr'
            }))
        ];

        const uniqueByRef = new Map();
        referenceMatches.forEach(item => {
            if (!uniqueByRef.has(item.reference)) {
                uniqueByRef.set(item.reference, item);
            }
        });

        const refs = [...uniqueByRef.values()];
        const references = refs.map(item => this.resolveMediaReference(item.reference, item.source));

        return {
            total: references.length,
            internal: references.filter(r => r.isInternal).length,
            resolved: references.filter(r => r.status === 'resolved').length,
            missing: references.filter(r => r.status === 'missing').length,
            external: references.filter(r => r.status === 'external').length,
            unknown: references.filter(r => r.status === 'unknown').length,
            references
        };
    }

    resolveMediaReference(reference, source) {
        const decoded = this.decodeReference(reference);
        const normalizedPath = this.normalizePackagePath(decoded);
        const lowerRef = decoded.toLowerCase();

        const isExternal =
            lowerRef.startsWith('http://') ||
            lowerRef.startsWith('https://') ||
            lowerRef.startsWith('//');

        if (isExternal) {
            return {
                reference,
                normalizedPath,
                source,
                status: 'external',
                isInternal: false
            };
        }

        const packageContext = this.options.packageContext || {};
        const packageFiles = packageContext.packageFiles instanceof Set ? packageContext.packageFiles : null;
        const manifestFiles = packageContext.manifestFiles instanceof Set ? packageContext.manifestFiles : null;

        if (packageFiles || manifestFiles) {
            const inPackage = packageFiles ? packageFiles.has(normalizedPath.toLowerCase()) : false;
            const inManifest = manifestFiles ? manifestFiles.has(normalizedPath.toLowerCase()) : false;

            return {
                reference,
                normalizedPath,
                source,
                status: (inPackage || inManifest) ? 'resolved' : 'missing',
                isInternal: true
            };
        }

        return {
            reference,
            normalizedPath,
            source,
            status: 'unknown',
            isInternal: true
        };
    }

    decodeReference(reference) {
        try {
            return decodeURIComponent(reference);
        } catch (error) {
            return reference;
        }
    }

    normalizePackagePath(pathValue) {
        return String(pathValue || '')
            .replace(/\\/g, '/')
            .replace(/^\$IMS-CC-FILEBASE\$\/?/i, '')
            .replace(/^\.\//, '')
            .trim();
    }

    /**
     * Check Canvas import readiness by analyzing raw XML for structural issues.
     * These are issues that prevent successful Canvas import even if the XML is well-formed.
     */
    checkCanvasImportReadiness() {
        const issues = [];
        const fixes = [];
        const xml = this.rawXml;

        if (!xml || this.version !== '1.2') {
            return { issues, fixes, fixable: false, totalFixable: 0 };
        }

        // 1. Check for QTI namespace on <questestinterop>
        const hasQtiNamespace = /<questestinterop[^>]*xmlns\s*=/.test(xml);
        if (!hasQtiNamespace && xml.includes('<questestinterop')) {
            issues.push({
                id: 'missing_qti_namespace',
                severity: 'high',
                label: 'Missing QTI Namespace',
                message: 'The <questestinterop> element has no XML namespace declaration',
                impact: 'Canvas may not recognise the file as valid QTI. The namespace xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" is required.',
                fixable: true
            });
            fixes.push('missing_qti_namespace');
        }

        // 2. Check for <itemmetadata> / question_type on items
        const itemRegex = /<item\s+[^>]*ident="([^"]*)"[^>]*>([\s\S]*?)<\/item>/g;
        let itemMatch;
        const itemsMissingMetadata = [];
        const itemsMissingResprocessing = [];
        const itemsMissingCdata = [];
        let totalItems = 0;

        while ((itemMatch = itemRegex.exec(xml)) !== null) {
            totalItems++;
            const ident = itemMatch[1];
            const itemContent = itemMatch[2];

            // Check for itemmetadata with question_type
            const hasItemMetadata = /<itemmetadata>/.test(itemContent);
            const hasQuestionType = /question_type/.test(itemContent);
            if (!hasItemMetadata || !hasQuestionType) {
                itemsMissingMetadata.push(ident);
            }

            // Check essay questions (response_str) for missing resprocessing
            if (/<response_str/.test(itemContent) && !/<resprocessing>/.test(itemContent)) {
                itemsMissingResprocessing.push(ident);
            }

            // Check for mattext without CDATA
            const mattextRegex = /<mattext\s+texttype="text\/html">(?!<!\[CDATA\[)([\s\S]*?)<\/mattext>/g;
            if (mattextRegex.test(itemContent)) {
                itemsMissingCdata.push(ident);
            }
        }

        if (itemsMissingMetadata.length > 0) {
            issues.push({
                id: 'missing_item_metadata',
                severity: 'high',
                label: 'Missing Item Metadata',
                message: `${itemsMissingMetadata.length} of ${totalItems} question${itemsMissingMetadata.length > 1 ? 's are' : ' is'} missing <itemmetadata> with question_type`,
                impact: 'Canvas cannot determine question types (multiple choice, essay, etc.) without this metadata. Questions may fail to import or be misclassified.',
                fixable: true,
                affectedItems: itemsMissingMetadata
            });
            fixes.push('missing_item_metadata');
        }

        if (itemsMissingResprocessing.length > 0) {
            issues.push({
                id: 'missing_essay_resprocessing',
                severity: 'high',
                label: 'Essay Questions Missing Scoring',
                message: `${itemsMissingResprocessing.length} essay question${itemsMissingResprocessing.length > 1 ? 's are' : ' is'} missing <resprocessing> block`,
                impact: 'Canvas expects a resprocessing block on all questions, even essays. These items may fail to import.',
                fixable: true,
                affectedItems: itemsMissingResprocessing
            });
            fixes.push('missing_essay_resprocessing');
        }

        if (itemsMissingCdata.length > 0) {
            issues.push({
                id: 'missing_cdata_wrap',
                severity: 'medium',
                label: 'HTML Content Not Wrapped in CDATA',
                message: `${itemsMissingCdata.length} question${itemsMissingCdata.length > 1 ? 's have' : ' has'} HTML content not wrapped in CDATA sections`,
                impact: 'Special characters or HTML in question text may cause XML parsing issues. Wrapping in CDATA is recommended.',
                fixable: true,
                affectedItems: itemsMissingCdata
            });
            fixes.push('missing_cdata_wrap');
        }

        return {
            issues,
            fixes,
            fixable: fixes.length > 0,
            totalFixable: fixes.length,
            totalItems
        };
    }

    /**
     * Detect the Canvas question_type for a QTI 1.2 item from raw XML.
     * Used by the fixer to inject correct metadata.
     */
    static detectCanvasQuestionType(itemXml) {
        // Essay questions use <response_str>
        if (/<response_str/.test(itemXml)) {
            return 'essay_question';
        }

        const isSingle = /rcardinality="Single"/.test(itemXml);
        const isMultiple = /rcardinality="Multiple"/.test(itemXml);

        if (isSingle) {
            // True/False: Single cardinality with only True and False options
            const hasTrueOption = />\s*True\s*<\/mattext>/i.test(itemXml);
            const hasFalseOption = />\s*False\s*<\/mattext>/i.test(itemXml);
            const labelCount = (itemXml.match(/<response_label/g) || []).length;
            if (hasTrueOption && hasFalseOption && labelCount === 2) {
                return 'true_false_question';
            }
            return 'multiple_choice_question';
        }

        if (isMultiple) {
            return 'multiple_answers_question';
        }

        // Matching
        if (/<response_grp/.test(itemXml)) {
            return 'matching_question';
        }

        // Numerical
        if (/<response_num/.test(itemXml)) {
            return 'numerical_question';
        }

        return 'multiple_choice_question'; // fallback
    }

    /**
     * Fix Canvas compatibility issues in raw QTI 1.2 XML.
     * Returns the fixed XML string.
     */
    static fixQtiXml(xmlContent) {
        let fixedXml = xmlContent;
        const appliedFixes = [];

        // Fix 1: Add QTI namespace to <questestinterop>
        if (/<questestinterop>/.test(fixedXml)) {
            fixedXml = fixedXml.replace(
                '<questestinterop>',
                '<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2p1.xsd">'
            );
            appliedFixes.push('missing_qti_namespace');
        }

        // Fix 2 & 3: Add itemmetadata and resprocessing to items
        const itemRegex = /(<item\s+ident="[^"]*"[^>]*>)([\s\S]*?)(<\/item>)/g;
        fixedXml = fixedXml.replace(itemRegex, (fullMatch, openTag, content, closeTag) => {
            let newContent = content;

            // Add itemmetadata if missing
            if (!/<itemmetadata>/.test(newContent)) {
                const questionType = QTIAnalyzer.detectCanvasQuestionType(fullMatch);

                // Detect points from question text or default to 1
                let points = '1.0';
                if (questionType === 'essay_question') {
                    const pointsMatch = fullMatch.match(/\((\d+)\s*points?\)/i);
                    if (pointsMatch) {
                        points = pointsMatch[1] + '.0';
                    }
                }

                const metadata = `\n        <itemmetadata>\n          <qtimetadata>\n            <qtimetadatafield>\n              <fieldlabel>question_type</fieldlabel>\n              <fieldentry>${questionType}</fieldentry>\n            </qtimetadatafield>\n            <qtimetadatafield>\n              <fieldlabel>points_possible</fieldlabel>\n              <fieldentry>${points}</fieldentry>\n            </qtimetadatafield>\n          </qtimetadata>\n        </itemmetadata>`;

                newContent = metadata + newContent;

                if (!appliedFixes.includes('missing_item_metadata')) {
                    appliedFixes.push('missing_item_metadata');
                }
            }

            // Add resprocessing to essay questions if missing
            const isEssay = /<response_str/.test(newContent);
            if (isEssay && !/<resprocessing>/.test(newContent)) {
                let maxScore = '1';
                const pointsMatch = fullMatch.match(/\((\d+)\s*points?\)/i);
                if (pointsMatch) maxScore = pointsMatch[1];

                const resprocessing = `\n        <resprocessing>\n          <outcomes>\n            <decvar varname="SCORE" vartype="Integer" minvalue="0" maxvalue="${maxScore}" />\n          </outcomes>\n          <respcondition continue="No">\n            <conditionvar>\n              <other />\n            </conditionvar>\n          </respcondition>\n        </resprocessing>`;

                newContent = newContent + resprocessing;

                if (!appliedFixes.includes('missing_essay_resprocessing')) {
                    appliedFixes.push('missing_essay_resprocessing');
                }
            }

            return openTag + newContent + closeTag;
        });

        // Fix 4: Wrap mattext content in CDATA
        fixedXml = fixedXml.replace(
            /<mattext texttype="text\/html">((?!<!\[CDATA\[)[\s\S]*?)<\/mattext>/g,
            (match, content) => {
                const trimmed = content.trim();
                if (!appliedFixes.includes('missing_cdata_wrap')) {
                    appliedFixes.push('missing_cdata_wrap');
                }
                return `<mattext texttype="text/html"><![CDATA[${trimmed}]]></mattext>`;
            }
        );

        return { fixedXml, appliedFixes };
    }

    /**
     * Generate a Canvas-compatible imsmanifest.xml for a standalone QTI file.
     */
    static generateCanvasManifest(assessmentTitle, quizFilename, resourceIdentifier) {
        return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1"
  xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2"
  xmlns:lom="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  identifier="MANIFEST-${resourceIdentifier}"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource http://www.imsglobal.org/profile/cc/ccv1p1/LOM/ccv1p1_lomresource_v1p0.xsd http://www.imsglobal.org/xsd/imsmd_v1p2 http://www.imsglobal.org/xsd/imsmd_v1p2p2.xsd">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.1.3</schemaversion>
    <imsmd:lom>
      <imsmd:general>
        <imsmd:title>
          <imsmd:langstring xml:lang="en-US">${assessmentTitle || ''}</imsmd:langstring>
        </imsmd:title>
      </imsmd:general>
    </imsmd:lom>
  </metadata>
  <organizations/>
  <resources>
    <resource href="${quizFilename}" identifier="${resourceIdentifier}" type="imsqti_xmlv1p2">
      <file href="${quizFilename}"/>
    </resource>
  </resources>
</manifest>
`;
    }

    /**
     * Check if an imsmanifest.xml has Canvas-compatible structure.
     */
    static checkManifestCompatibility(manifestXml) {
        const issues = [];

        // Check for Common Cartridge namespace
        const hasCcNamespace = /xmlns\s*=\s*"[^"]*imsccv1p1/.test(manifestXml);
        if (!hasCcNamespace) {
            issues.push({
                id: 'manifest_wrong_namespace',
                severity: 'high',
                label: 'Manifest Missing CC Namespace',
                message: 'The manifest does not use the Common Cartridge namespace (imsccv1p1)',
                impact: 'Canvas expects the CC namespace for reliable imports. Using the generic IMS CP namespace may cause import failures.',
                fixable: true
            });
        }

        // Check for <metadata> block
        const hasMetadata = /<metadata>/.test(manifestXml);
        if (!hasMetadata) {
            issues.push({
                id: 'manifest_missing_metadata',
                severity: 'medium',
                label: 'Manifest Missing Metadata',
                message: 'The manifest is missing the <metadata> section with schema version info',
                impact: 'While not strictly required, Canvas imports are more reliable with proper metadata including schema version.',
                fixable: true
            });
        }

        // Check for <organizations/>
        const hasOrganizations = /<organizations\s*\/>|<organizations>/.test(manifestXml);
        if (!hasOrganizations) {
            issues.push({
                id: 'manifest_missing_organizations',
                severity: 'medium',
                label: 'Manifest Missing Organizations Element',
                message: 'The manifest is missing the <organizations/> element',
                impact: 'The IMS Content Packaging spec requires this element even when empty.',
                fixable: true
            });
        }

        return issues;
    }

    /**
     * Fix Canvas compatibility issues in a ZIP package.
     * Fixes quiz XML files AND the imsmanifest.xml.
     * Returns a new ZIP buffer.
     */
    static async fixCanvasCompatibility(zipBuffer) {
        const extractor = new QTIPackageExtractor(zipBuffer);
        const packageData = await extractor.extract();

        const zip = await JSZip.loadAsync(zipBuffer);
        const allFixes = [];
        let manifestFixed = false;

        // --- Phase 1: Fix identifier mismatches (manifest ident vs assessment ident) ---
        const resourceMap = packageData.manifest ? extractor.getResourceIdentifierMap() : {};

        // Fix assessment XML files (compatibility + identifier in one pass)
        for (const assessmentFile of packageData.assessmentFiles) {
            let xmlContent = assessmentFile.content;
            const fileFixes = [];

            // 1a. Fix identifier mismatch
            const normalizedFilename = assessmentFile.filename.replace(/\\/g, '/').trim().toLowerCase();
            const resourceEntry = resourceMap[normalizedFilename];
            if (resourceEntry) {
                const manifestIdentifier = resourceEntry.identifier;

                const assessmentMatch12 = xmlContent.match(/<assessment\s([^>]*?)ident\s*=\s*"([^"]*?)"/);
                const assessmentMatch21 = xmlContent.match(/<assessmentTest\s([^>]*?)identifier\s*=\s*"([^"]*?)"/);

                if (assessmentMatch12 && assessmentMatch12[2] !== manifestIdentifier) {
                    xmlContent = xmlContent.replace(
                        /(<assessment\s[^>]*?)ident\s*=\s*"[^"]*?"/,
                        `$1ident="${manifestIdentifier}"`
                    );
                    fileFixes.push(`identifier_fixed: ${assessmentMatch12[2]} → ${manifestIdentifier}`);
                } else if (assessmentMatch21 && assessmentMatch21[2] !== manifestIdentifier) {
                    xmlContent = xmlContent.replace(
                        /(<assessmentTest\s[^>]*?)identifier\s*=\s*"[^"]*?"/,
                        `$1identifier="${manifestIdentifier}"`
                    );
                    fileFixes.push(`identifier_fixed: ${assessmentMatch21[2]} → ${manifestIdentifier}`);
                }
            }

            // 1b. Fix Canvas compatibility issues (namespace, metadata, CDATA, etc.)
            const { fixedXml, appliedFixes } = QTIAnalyzer.fixQtiXml(xmlContent);
            fileFixes.push(...appliedFixes);

            if (fileFixes.length > 0) {
                zip.file(assessmentFile.filename, fixedXml);
                allFixes.push({
                    filename: assessmentFile.filename,
                    type: 'quiz_xml',
                    fixes: fileFixes
                });
            }
        }

        // Fix or generate imsmanifest.xml
        const manifestFile = zip.file('imsmanifest.xml');
        if (manifestFile) {
            const manifestContent = await manifestFile.async('string');
            const manifestIssues = QTIAnalyzer.checkManifestCompatibility(manifestContent);

            if (manifestIssues.length > 0) {
                // Extract info needed to regenerate the manifest
                let title = '';
                let quizFilename = '';
                let resourceId = '';

                // Get resource info from existing manifest
                const resourceMatch = manifestContent.match(/<resource[^>]*href="([^"]*)"[^>]*identifier="([^"]*)"/);
                if (!resourceMatch) {
                    // Try alternate attribute order
                    const altMatch = manifestContent.match(/<resource[^>]*identifier="([^"]*)"[^>]*href="([^"]*)"/);
                    if (altMatch) {
                        resourceId = altMatch[1];
                        quizFilename = altMatch[2];
                    }
                } else {
                    quizFilename = resourceMatch[1];
                    resourceId = resourceMatch[2];
                }

                // Extract title from assessment files
                if (packageData.assessmentFiles.length > 0) {
                    const titleMatch = packageData.assessmentFiles[0].content.match(/title="([^"]*)"/);
                    if (titleMatch) title = titleMatch[1];
                }

                if (quizFilename && resourceId) {
                    const newManifest = QTIAnalyzer.generateCanvasManifest(title, quizFilename, resourceId);
                    zip.file('imsmanifest.xml', newManifest);
                    manifestFixed = true;
                    allFixes.push({
                        filename: 'imsmanifest.xml',
                        type: 'manifest',
                        fixes: manifestIssues.map(i => i.id)
                    });
                }
            }
        } else if (packageData.assessmentFiles.length > 0) {
            // No manifest exists - generate one
            const firstFile = packageData.assessmentFiles[0];
            const titleMatch = firstFile.content.match(/title="([^"]*)"/);
            const title = titleMatch ? titleMatch[1] : '';
            const identMatch = firstFile.content.match(/<assessment[^>]*ident="([^"]*)"/);
            const resourceId = identMatch ? identMatch[1] : 'RESOURCE1';

            const newManifest = QTIAnalyzer.generateCanvasManifest(title, firstFile.filename, resourceId);
            zip.file('imsmanifest.xml', newManifest);
            manifestFixed = true;
            allFixes.push({
                filename: 'imsmanifest.xml',
                type: 'manifest',
                fixes: ['manifest_generated']
            });
        }

        if (allFixes.length === 0) {
            return { fixedBuffer: null, fixes: [], message: 'No Canvas compatibility issues found — nothing to fix.' };
        }

        const fixedBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        const totalFixCount = allFixes.reduce((sum, f) => sum + f.fixes.length, 0);
        return {
            fixedBuffer,
            fixes: allFixes,
            message: `Applied ${totalFixCount} fix${totalFixCount > 1 ? 'es' : ''} across ${allFixes.length} file${allFixes.length > 1 ? 's' : ''}.`
        };
    }

    /**
     * Fix Canvas compatibility for a standalone XML file (non-ZIP).
     * Returns the fixed XML and optionally a generated manifest.
     */
    static fixStandaloneQtiXml(xmlContent, filename) {
        const { fixedXml, appliedFixes } = QTIAnalyzer.fixQtiXml(xmlContent);

        // Generate a manifest too
        const titleMatch = fixedXml.match(/title="([^"]*)"/);
        const title = titleMatch ? titleMatch[1] : '';
        const identMatch = fixedXml.match(/<assessment[^>]*ident="([^"]*)"/);
        const resourceId = identMatch ? identMatch[1] : 'RESOURCE1';
        const manifest = QTIAnalyzer.generateCanvasManifest(title, filename, resourceId);

        return {
            fixedXml,
            manifest,
            appliedFixes
        };
    }

    /**
     * Get warnings
     */
    getWarnings() {
        const warnings = [];
        const metadata = this.getMetadata();

        if (!metadata.title) {
            warnings.push({
                type: 'missing_metadata',
                severity: 'medium',
                message: 'Missing title metadata'
            });
        }

        if (metadata.questionCount === 0) {
            warnings.push({
                type: 'no_questions',
                severity: 'high',
                message: 'No questions found in file'
            });
        }

        return warnings;
    }

    /**
     * Static method to analyze XML content
     */
    static async analyzeXML(xmlContent) {
        const parser = new QTIParser(xmlContent);
        const parseResult = parser.parse();

        if (!parseResult.success) {
            throw new Error('Failed to parse QTI XML: ' + parseResult.errors.map(e => e.message).join(', '));
        }

        const analyzer = new QTIAnalyzer(parseResult);
        return analyzer.generateReport();
    }

    /**
     * Static method to analyze ZIP package
     */
    static async analyzePackage(zipBuffer) {
        const extractor = new QTIPackageExtractor(zipBuffer);
        const packageData = await extractor.extract();

        if (packageData.assessmentFiles.length === 0) {
            throw new Error('No QTI files found in ZIP package');
        }

        const analyzedFiles = [];
        const failedFiles = [];
        const allQuestions = [];
        const mediaAnalyses = [];

        const zip = await JSZip.loadAsync(zipBuffer);
        const packageFiles = new Set();
        zip.forEach((relativePath, file) => {
            if (!file.dir) {
                packageFiles.add(relativePath.replace(/\\/g, '/').toLowerCase());
            }
        });

        let manifestFiles = new Set();
        const manifestFile = zip.file('imsmanifest.xml');
        if (manifestFile) {
            const manifestRaw = await manifestFile.async('string');
            const manifestRefs = [...manifestRaw.matchAll(/<file\s+href="([^"]+)"/g)].map(match =>
                match[1].replace(/\\/g, '/').trim().toLowerCase()
            );
            manifestFiles = new Set(manifestRefs);
        }

        for (const assessmentFile of packageData.assessmentFiles) {
            const parser = new QTIParser(assessmentFile.content);
            const parseResult = parser.parse();

            if (!parseResult.success) {
                failedFiles.push({
                    filename: assessmentFile.filename,
                    errors: parseResult.errors
                });
                continue;
            }

            const analyzer = new QTIAnalyzer(parseResult, {
                packageContext: {
                    packageFiles,
                    manifestFiles
                }
            });
            const fileReport = analyzer.generateReport();
            const fileQuestions = analyzer.extractAllQuestions();

            analyzedFiles.push({
                filename: assessmentFile.filename,
                report: fileReport
            });

            allQuestions.push(...fileQuestions);
            mediaAnalyses.push(fileReport.mediaAnalysis);
        }

        if (analyzedFiles.length === 0) {
            throw new Error('Failed to parse any QTI assessment files in ZIP package');
        }

        const report = analyzedFiles[0].report;
        const supportAnalyzer = new QTIAnalyzer({ data: {}, version: report.version, success: true });

        const allMediaReferences = [];
        mediaAnalyses.forEach(media => {
            if (media && Array.isArray(media.references)) {
                allMediaReferences.push(...media.references);
            }
        });

        if (allMediaReferences.length > 0) {
            const uniqueRefs = [];
            const seen = new Set();
            allMediaReferences.forEach(ref => {
                const key = `${ref.reference}|${ref.source}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueRefs.push(ref);
                }
            });

            report.mediaAnalysis = {
                total: uniqueRefs.length,
                internal: uniqueRefs.filter(r => r.isInternal).length,
                resolved: uniqueRefs.filter(r => r.status === 'resolved').length,
                missing: uniqueRefs.filter(r => r.status === 'missing').length,
                external: uniqueRefs.filter(r => r.status === 'external').length,
                unknown: uniqueRefs.filter(r => r.status === 'unknown').length,
                references: uniqueRefs
            };
        }

        if (allQuestions.length > 0) {
            const byType = {};
            const byPoints = {
                '0': 0,
                '1-5': 0,
                '6-10': 0,
                '11+': 0
            };

            let withFeedback = 0;
            let withMedia = 0;
            const pointValues = [];

            allQuestions.forEach(question => {
                const type = question.type || 'unknown';
                const parsedPoints = Number.parseFloat(question.points);
                const points = Number.isFinite(parsedPoints) ? parsedPoints : 0;

                byType[type] = (byType[type] || 0) + 1;

                if (points === 0) byPoints['0']++;
                else if (points <= 5) byPoints['1-5']++;
                else if (points <= 10) byPoints['6-10']++;
                else byPoints['11+']++;

                if (question.hasFeedback) withFeedback++;
                if (question.hasMedia) withMedia++;

                pointValues.push(points);
            });

            report.questionSummary = {
                total: allQuestions.length,
                byType,
                byPoints,
                withFeedback,
                withMedia
            };

            report.metadata.questionCount = allQuestions.length;

            const interactionTypes = {};
            Object.entries(byType).forEach(([type, count]) => {
                interactionTypes[type] = {
                    count,
                    canvasSupported: supportAnalyzer.isCanvasSupportedType(type)
                };
            });

            report.interactionTypes = {
                total: allQuestions.length,
                types: interactionTypes
            };

            const totalPoints = pointValues.reduce((sum, val) => sum + val, 0);
            const pointDistribution = {};
            pointValues.forEach(val => {
                pointDistribution[val] = (pointDistribution[val] || 0) + 1;
            });

            report.scoringAnalysis = {
                totalPoints,
                averagePoints: pointValues.length > 0 ? totalPoints / pointValues.length : 0,
                minPoints: pointValues.length > 0 ? Math.min(...pointValues) : 0,
                maxPoints: pointValues.length > 0 ? Math.max(...pointValues) : 0,
                pointDistribution
            };
        }

        // Check manifest resource identifier vs assessment ident mismatches
        const resourceIdentifierMap = extractor.getResourceIdentifierMap();
        const identifierChecks = [];

        // Warn if manifest is missing from the package
        if (!packageData.manifest) {
            report.canvasCompatibility.warnings.push({
                severity: 'high',
                type: 'missing_manifest',
                message: 'No imsmanifest.xml found in ZIP package',
                impact: 'Canvas may still import the assessment, but a manifest file is recommended for reliable imports, especially with "Convert to New Quizzes".'
            });

            report.canvasCompatibility.score = Math.max(0, report.canvasCompatibility.score - 10);

            report.canvasCompatibility.recommendations = report.canvasCompatibility.recommendations.filter(
                r => r !== 'File appears compatible with Canvas - ready for import'
            );
            report.canvasCompatibility.recommendations.push(
                'Add an imsmanifest.xml file to the ZIP package for reliable Canvas imports'
            );
        }

        for (const analyzedFile of analyzedFiles) {
            const normalizedFilename = analyzedFile.filename.replace(/\\/g, '/').trim().toLowerCase();
            const resourceEntry = resourceIdentifierMap[normalizedFilename];

            if (resourceEntry) {
                const assessmentIdent = analyzedFile.report.metadata?.identifier;
                const manifestIdentifier = resourceEntry.identifier;

                identifierChecks.push({
                    filename: analyzedFile.filename,
                    manifestIdentifier: manifestIdentifier,
                    assessmentIdent: assessmentIdent != null ? String(assessmentIdent) : 'N/A',
                    match: manifestIdentifier === String(assessmentIdent),
                    resourceType: resourceEntry.type
                });
            }
        }

        const hasMismatches = identifierChecks.some(c => !c.match);

        report.manifestIdentifierCheck = {
            checked: identifierChecks.length > 0,
            hasManifest: packageData.manifest !== null,
            totalResources: identifierChecks.length,
            mismatches: identifierChecks.filter(c => !c.match),
            matches: identifierChecks.filter(c => c.match),
            details: identifierChecks,
            hasMismatches
        };

        // Add high-severity compatibility issue for mismatches
        if (hasMismatches) {
            const mismatchCount = identifierChecks.filter(c => !c.match).length;
            report.canvasCompatibility.issues.push({
                severity: 'high',
                type: 'manifest_identifier_mismatch',
                message: `${mismatchCount} assessment file${mismatchCount > 1 ? 's have' : ' has'} identifier mismatch between imsmanifest.xml and assessment XML`,
                impact: 'Import with "Convert to New Quizzes" will fail. The resource identifier in imsmanifest.xml must match the assessment ident in the quiz XML file.'
            });

            // Reduce score for high severity issue
            report.canvasCompatibility.score = Math.max(0, report.canvasCompatibility.score - 20);
            report.canvasCompatibility.compatible = false;

            // Remove the generic "ready for import" recommendation if present
            report.canvasCompatibility.recommendations = report.canvasCompatibility.recommendations.filter(
                r => r !== 'File appears compatible with Canvas - ready for import'
            );
            report.canvasCompatibility.recommendations.push(
                'Fix identifier mismatches: update the assessment ident attribute in each quiz XML to match the corresponding resource identifier in imsmanifest.xml'
            );
        }

        // Add package info
        report.packageInfo = {
            fileCount: packageData.fileCount,
            files: packageData.assessmentFiles.map(f => f.filename),
            hasManifest: packageData.manifest !== null,
            analyzedFileCount: analyzedFiles.length,
            failedFileCount: failedFiles.length,
            failedFiles
        };

        // Check manifest compatibility and merge into canvasImportReadiness
        if (packageData.manifest) {
            const manifestFile = zip.file('imsmanifest.xml');
            if (manifestFile) {
                const manifestRawContent = await manifestFile.async('string');
                const manifestIssues = QTIAnalyzer.checkManifestCompatibility(manifestRawContent);
                if (!report.canvasImportReadiness) {
                    report.canvasImportReadiness = { issues: [], fixes: [], fixable: false, totalFixable: 0 };
                }
                manifestIssues.forEach(issue => {
                    report.canvasImportReadiness.issues.push(issue);
                    report.canvasImportReadiness.fixes.push(issue.id);
                });
                if (manifestIssues.length > 0) {
                    report.canvasImportReadiness.fixable = true;
                    report.canvasImportReadiness.totalFixable = report.canvasImportReadiness.fixes.length;
                }
            }
        }

        // Re-adjust score for any newly found import readiness issues
        if (report.canvasImportReadiness && report.canvasImportReadiness.issues.length > 0) {
            const readiness = report.canvasImportReadiness;
            const highCount = readiness.issues.filter(i => i.severity === 'high').length;
            const medCount = readiness.issues.filter(i => i.severity === 'medium').length;
            // Only penalise once (generateReport already penalises for single-file checks)
            const existingReadinessIssue = report.canvasCompatibility.issues.find(i => i.type === 'canvas_import_readiness');
            if (!existingReadinessIssue && highCount > 0) {
                report.canvasCompatibility.issues.push({
                    severity: 'high',
                    type: 'canvas_import_readiness',
                    message: `${highCount + medCount} Canvas import readiness issue${highCount + medCount > 1 ? 's' : ''} found (missing namespace, metadata, manifest issues, etc.)`,
                    impact: 'These issues will likely cause import failures or incorrect question type mapping in Canvas'
                });
                report.canvasCompatibility.score = Math.max(0, report.canvasCompatibility.score - (highCount * 15 + medCount * 5));
                report.canvasCompatibility.compatible = false;
                report.canvasCompatibility.recommendations = report.canvasCompatibility.recommendations.filter(
                    r => r !== 'File appears compatible with Canvas - ready for import'
                );
                report.canvasCompatibility.recommendations.push(
                    'Use the "Fix Canvas Compatibility" button to automatically resolve structural issues'
                );
            }
        }

        return report;
    }

    /**
     * Static method to fix identifier mismatches in a QTI ZIP package.
     * Updates each assessment XML's ident attribute to match the resource
     * identifier declared in imsmanifest.xml, then returns a new ZIP buffer.
     */
    static async fixIdentifiers(zipBuffer) {
        const extractor = new QTIPackageExtractor(zipBuffer);
        const packageData = await extractor.extract();

        if (!packageData.manifest) {
            throw new Error('No imsmanifest.xml found in ZIP package');
        }

        const resourceMap = extractor.getResourceIdentifierMap();
        if (Object.keys(resourceMap).length === 0) {
            throw new Error('No resource identifiers found in imsmanifest.xml');
        }

        const zip = await JSZip.loadAsync(zipBuffer);
        const fixes = [];

        for (const assessmentFile of packageData.assessmentFiles) {
            const normalizedFilename = assessmentFile.filename.replace(/\\/g, '/').trim().toLowerCase();
            const resourceEntry = resourceMap[normalizedFilename];

            if (!resourceEntry) continue;

            const manifestIdentifier = resourceEntry.identifier;
            let xmlContent = assessmentFile.content;

            // Detect what the current assessment ident is
            // For QTI 1.2: <assessment ident="...">
            const assessmentMatch12 = xmlContent.match(/<assessment\s([^>]*?)ident\s*=\s*"([^"]*?)"/);
            // For QTI 2.1: <assessmentTest identifier="...">
            const assessmentMatch21 = xmlContent.match(/<assessmentTest\s([^>]*?)identifier\s*=\s*"([^"]*?)"/);

            let currentIdent = null;
            let fixed = false;

            if (assessmentMatch12) {
                currentIdent = assessmentMatch12[2];
                if (currentIdent !== manifestIdentifier) {
                    // Replace ident value in the <assessment> tag
                    xmlContent = xmlContent.replace(
                        /(<assessment\s[^>]*?)ident\s*=\s*"[^"]*?"/,
                        `$1ident="${manifestIdentifier}"`
                    );
                    fixed = true;
                }
            } else if (assessmentMatch21) {
                currentIdent = assessmentMatch21[2];
                if (currentIdent !== manifestIdentifier) {
                    xmlContent = xmlContent.replace(
                        /(<assessmentTest\s[^>]*?)identifier\s*=\s*"[^"]*?"/,
                        `$1identifier="${manifestIdentifier}"`
                    );
                    fixed = true;
                }
            }

            if (fixed) {
                zip.file(assessmentFile.filename, xmlContent);
                fixes.push({
                    filename: assessmentFile.filename,
                    oldIdent: currentIdent,
                    newIdent: manifestIdentifier
                });
            }
        }

        if (fixes.length === 0) {
            return { fixedBuffer: null, fixes: [], message: 'No mismatches found — nothing to fix.' };
        }

        const fixedBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        return {
            fixedBuffer,
            fixes,
            message: `Fixed ${fixes.length} identifier mismatch${fixes.length > 1 ? 'es' : ''}.`
        };
    }
}

module.exports = {
    QTIAnalyzer,
    QTIParser,
    QTIPackageExtractor,
    QTIValidator
};
