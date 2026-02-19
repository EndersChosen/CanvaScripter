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
        return {
            version: this.version,
            metadata: this.getMetadata(),
            validation: this.getValidationResults(),
            questionSummary: this.getQuestionSummary(),
            interactionTypes: this.getInteractionTypes(),
            scoringAnalysis: this.getScoringAnalysis(),
            canvasCompatibility: this.checkCanvasCompatibility(),
            contentAnalysis: this.analyzeContent(),
            mediaAnalysis: this.analyzeMediaReferences(),
            warnings: this.getWarnings()
        };
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
            warnings.push({
                severity: 'medium',
                type: 'external_references',
                message: 'External media references detected',
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

        return {
            hasImages: content.includes('<img') || content.includes('matimage'),
            hasAudio: content.includes('<audio') || content.includes('mataudio'),
            hasVideo: content.includes('<video') || content.includes('matvideo'),
            hasExternalLinks: content.includes('http://') || content.includes('https://'),
            hasMath: content.includes('math>') || content.includes('mathml') || content.includes('latex'),
            hasTables: content.includes('<table'),
            hasFormattedText: content.includes('<p>') || content.includes('<div>')
        };
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

        // Add package info
        report.packageInfo = {
            fileCount: packageData.fileCount,
            files: packageData.assessmentFiles.map(f => f.filename),
            hasManifest: packageData.manifest !== null,
            analyzedFileCount: analyzedFiles.length,
            failedFileCount: failedFiles.length,
            failedFiles
        };

        return report;
    }
}

module.exports = {
    QTIAnalyzer,
    QTIParser,
    QTIPackageExtractor,
    QTIValidator
};
