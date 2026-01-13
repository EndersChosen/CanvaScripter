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
                success: true
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
                success: false
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
        // Check response types
        const presentation = item.presentation;
        if (!presentation) return 'unknown';

        if (presentation.response_lid) return 'Multiple Choice';
        if (presentation.response_str) return 'Fill in Blank';
        if (presentation.response_num) return 'Numerical';
        if (presentation.response_xy) return 'Hotspot';
        if (presentation.response_grp) return 'Matching';

        return 'unknown';
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
            'Essay',
            'Matching',
            'Multiple Answers',
            'Numerical'
        ];
        const limited = ['Hotspot'];

        if (supported.includes(type)) return 'full';
        if (limited.includes(type)) return 'limited';
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

        // Analyze the first QTI file (or combine multiple if needed)
        const firstFile = packageData.assessmentFiles[0];
        const parser = new QTIParser(firstFile.content);
        const parseResult = parser.parse();

        if (!parseResult.success) {
            throw new Error('Failed to parse QTI file in package: ' + parseResult.errors.map(e => e.message).join(', '));
        }

        const analyzer = new QTIAnalyzer(parseResult);
        const report = analyzer.generateReport();

        // Add package info
        report.packageInfo = {
            fileCount: packageData.fileCount,
            files: packageData.assessmentFiles.map(f => f.filename),
            hasManifest: packageData.manifest !== null
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
