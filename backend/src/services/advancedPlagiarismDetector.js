/**
 * Advanced Plagiarism Detection Service
 * Implements sophisticated plagiarism detection using multiple algorithms
 */

const crypto = require('crypto');
const natural = require('natural');
const { 
    SentenceTransformer, 
    util 
} = require('transformers');
const tf = require('@tensorflow/tfjs-node');
const { 
    JaroWinklerDistance, 
    LevenshteinDistance, 
    DiceCoefficient 
} = require('natural');
const redis = require('redis');
const fs = require('fs').promises;
const path = require('path');

class AdvancedPlagiarismDetector {
    constructor() {
        this.config = {
            redisHost: process.env.REDIS_HOST || 'localhost',
            redisPort: process.env.REDIS_PORT || 6379,
            redisPassword: process.env.REDIS_PASSWORD,
            similarityThreshold: 0.85,
            semanticThreshold: 0.8,
            structuralThreshold: 0.75,
            cacheTimeout: 60 * 60 * 1000, // 1 hour
            maxComparisons: 100,
            useTransformers: true,
            transformerModel: 'sentence-transformers/all-MiniLM-L6-v2'
        };
        
        // Initialize connections
        this.redisClient = null;
        this.transformerModel = null;
        
        // Text processing utilities
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        this.stopwords = new Set(natural.stopwords);
        
        // Initialize services
        this.initializeConnections();
        this.loadModels();
    }

    /**
     * Initialize database connections
     */
    async initializeConnections() {
        try {
            this.redisClient = redis.createClient({
                host: this.config.redisHost,
                port: this.config.redisPort,
                password: this.config.redisPassword,
                db: 8 // Separate DB for plagiarism detection
            });
            
            await this.redisClient.connect();
            console.log('Plagiarism Detector: Redis connected');
            
        } catch (error) {
            console.error('Failed to initialize connections:', error);
            throw error;
        }
    }

    /**
     * Load ML models for plagiarism detection
     */
    async loadModels() {
        try {
            if (this.config.useTransformers) {
                // Load sentence transformer model
                this.transformerModel = await SentenceTransformer.fromPretrained(
                    this.config.transformerModel
                );
                console.log('Plagiarism Detector: Transformer model loaded');
            }
            
            // Load TensorFlow models for custom detection
            await this.loadTensorFlowModels();
            
        } catch (error) {
            console.error('Failed to load models:', error);
            // Continue without advanced models
        }
    }

    /**
     * Load TensorFlow models for custom plagiarism detection
     */
    async loadTensorFlowModels() {
        try {
            // Load pre-trained model for code plagiarism detection
            const modelPath = path.join(__dirname, '../models/plagiarism_model');
            
            if (await this.fileExists(modelPath)) {
                this.codeModel = await tf.loadLayersModel(`file://${modelPath}`);
                console.log('Plagiarism Detector: TensorFlow code model loaded');
            }
            
        } catch (error) {
            console.warn('Failed to load TensorFlow models:', error.message);
        }
    }

    /**
     * Main plagiarism detection method
     */
    async detectPlagiarism(submission) {
        const {
            submissionId,
            userId,
            assignmentId,
            content,
            contentType = 'text', // 'text', 'code', 'mixed'
            metadata = {}
        } = submission;

        try {
            console.log(`Starting plagiarism analysis for submission ${submissionId}`);
            
            // Check cache first
            const cacheKey = `plagiarism:${submissionId}`;
            const cachedResult = await this.getFromCache(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // Preprocess content
            const preprocessedContent = await this.preprocessContent(content, contentType);
            
            // Get comparison submissions
            const comparisonSubmissions = await this.getComparisonSubmissions(
                assignmentId, 
                userId
            );
            
            // Perform multi-layered analysis
            const analysisResults = await Promise.all([
                this.performLexicalAnalysis(preprocessedContent, comparisonSubmissions),
                this.performSemanticAnalysis(preprocessedContent, comparisonSubmissions),
                this.performStructuralAnalysis(preprocessedContent, comparisonSubmissions),
                this.performSyntacticAnalysis(preprocessedContent, comparisonSubmissions)
            ]);

            // Combine results
            const combinedAnalysis = this.combineAnalysisResults(analysisResults);
            
            // Generate detailed report
            const plagiarismReport = await this.generatePlagiarismReport(
                submission,
                combinedAnalysis,
                comparisonSubmissions
            );
            
            // Cache results
            await this.setCache(cacheKey, plagiarismReport);
            
            // Store analysis for future reference
            await this.storePlagiarismAnalysis(submissionId, plagiarismReport);
            
            console.log(`Plagiarism analysis completed for submission ${submissionId}`);
            return plagiarismReport;
            
        } catch (error) {
            console.error('Error in plagiarism detection:', error);
            throw new Error(`Plagiarism detection failed: ${error.message}`);
        }
    }

    /**
     * Preprocess content for analysis
     */
    async preprocessContent(content, contentType) {
        let processed = {
            original: content,
            tokens: [],
            sentences: [],
            cleaned: '',
            features: {}
        };

        switch (contentType) {
            case 'text':
                processed = await this.preprocessText(content);
                break;
            case 'code':
                processed = await this.preprocessCode(content);
                break;
            case 'mixed':
                processed = await this.preprocessMixedContent(content);
                break;
        }

        return processed;
    }

    /**
     * Preprocess text content
     */
    async preprocessText(content) {
        // Normalize text
        let cleaned = content.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Tokenize
        const tokens = this.tokenizer.tokenize(cleaned);
        const filteredTokens = tokens.filter(token => !this.stopwords.has(token));
        const stemmedTokens = filteredTokens.map(token => this.stemmer.stem(token));

        // Extract sentences
        const sentences = natural.SentenceTokenizer.tokenize(content);

        // Calculate features
        const features = {
            wordCount: tokens.length,
            uniqueWordCount: new Set(tokens).size,
            sentenceCount: sentences.length,
            averageWordLength: tokens.reduce((sum, word) => sum + word.length, 0) / tokens.length,
            vocabularyRichness: new Set(tokens).size / tokens.length
        };

        return {
            original: content,
            tokens: stemmedTokens,
            sentences,
            cleaned,
            features
        };
    }

    /**
     * Preprocess code content
     */
    async preprocessCode(content) {
        // Remove comments and normalize whitespace
        let cleaned = content
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .replace(/\/\/.*$/gm, '') // Remove line comments
            .replace(/\s+/g, ' ')
            .trim();

        // Extract code tokens
        const tokens = this.extractCodeTokens(content);
        const uniqueTokens = new Set(tokens);

        // Extract code structures
        const structures = this.extractCodeStructures(content);

        const features = {
            tokenCount: tokens.length,
            uniqueTokenCount: uniqueTokens.size,
            lineCount: content.split('\n').length,
            complexity: this.calculateCyclomaticComplexity(content),
            structures: structures
        };

        return {
            original: content,
            tokens: Array.from(uniqueTokens),
            cleaned,
            features
        };
    }

    /**
     * Perform lexical analysis (text similarity)
     */
    async performLexicalAnalysis(content, comparisonSubmissions) {
        const results = {
            method: 'lexical',
            similarities: [],
            maxSimilarity: 0,
            averageSimilarity: 0
        };

        for (const submission of comparisonSubmissions) {
            const similarity = this.calculateLexicalSimilarity(
                content.cleaned,
                submission.cleaned
            );

            results.similarities.push({
                submissionId: submission.submissionId,
                userId: submission.userId,
                similarity,
                method: 'lexical'
            });

            results.maxSimilarity = Math.max(results.maxSimilarity, similarity);
        }

        results.averageSimilarity = results.similarities.reduce(
            (sum, s) => sum + s.similarity, 0
        ) / results.similarities.length;

        return results;
    }

    /**
     * Perform semantic analysis (meaning similarity)
     */
    async performSemanticAnalysis(content, comparisonSubmissions) {
        const results = {
            method: 'semantic',
            similarities: [],
            maxSimilarity: 0,
            averageSimilarity: 0
        };

        if (!this.transformerModel) {
            // Fallback to simpler semantic analysis
            return this.performBasicSemanticAnalysis(content, comparisonSubmissions);
        }

        try {
            // Generate embeddings for the content
            const contentEmbedding = await this.transformerModel.encode(
                content.original,
                { normalize: true }
            );

            for (const submission of comparisonSubmissions) {
                const submissionEmbedding = await this.transformerModel.encode(
                    submission.original,
                    { normalize: true }
                );

                // Calculate cosine similarity
                const similarity = this.cosineSimilarity(
                    contentEmbedding,
                    submissionEmbedding
                );

                results.similarities.push({
                    submissionId: submission.submissionId,
                    userId: submission.userId,
                    similarity,
                    method: 'semantic'
                });

                results.maxSimilarity = Math.max(results.maxSimilarity, similarity);
            }

            results.averageSimilarity = results.similarities.reduce(
                (sum, s) => sum + s.similarity, 0
            ) / results.similarities.length;

        } catch (error) {
            console.error('Error in semantic analysis:', error);
            // Fallback to basic analysis
            return this.performBasicSemanticAnalysis(content, comparisonSubmissions);
        }

        return results;
    }

    /**
     * Perform structural analysis (pattern similarity)
     */
    async performStructuralAnalysis(content, comparisonSubmissions) {
        const results = {
            method: 'structural',
            similarities: [],
            maxSimilarity: 0,
            averageSimilarity: 0
        };

        for (const submission of comparisonSubmissions) {
            const similarity = this.calculateStructuralSimilarity(
                content,
                submission
            );

            results.similarities.push({
                submissionId: submission.submissionId,
                userId: submission.userId,
                similarity,
                method: 'structural'
            });

            results.maxSimilarity = Math.max(results.maxSimilarity, similarity);
        }

        results.averageSimilarity = results.similarities.reduce(
            (sum, s) => sum + s.similarity, 0
        ) / results.similarities.length;

        return results;
    }

    /**
     * Perform syntactic analysis (writing style similarity)
     */
    async performSyntacticAnalysis(content, comparisonSubmissions) {
        const results = {
            method: 'syntactic',
            similarities: [],
            maxSimilarity: 0,
            averageSimilarity: 0
        };

        for (const submission of comparisonSubmissions) {
            const similarity = this.calculateSyntacticSimilarity(
                content,
                submission
            );

            results.similarities.push({
                submissionId: submission.submissionId,
                userId: submission.userId,
                similarity,
                method: 'syntactic'
            });

            results.maxSimilarity = Math.max(results.maxSimilarity, similarity);
        }

        results.averageSimilarity = results.similarities.reduce(
            (sum, s) => sum + s.similarity, 0
        ) / results.similarities.length;

        return results;
    }

    /**
     * Calculate lexical similarity using multiple algorithms
     */
    calculateLexicalSimilarity(text1, text2) {
        // Jaro-Winkler distance
        const jaroWinkler = 1 - JaroWinklerDistance(text1, text2);
        
        // Levenshtein distance
        const levenshtein = 1 - (LevenshteinDistance(text1, text2) / 
                                 Math.max(text1.length, text2.length));
        
        // Dice coefficient
        const dice = DiceCoefficient(text1, text2);
        
        // Weighted combination
        return (jaroWinkler * 0.4 + levenshtein * 0.3 + dice * 0.3);
    }

    /**
     * Calculate cosine similarity between embeddings
     */
    cosineSimilarity(embedding1, embedding2) {
        const dotProduct = tf.dot(embedding1, embedding2).dataSync()[0];
        const norm1 = tf.norm(embedding1).dataSync()[0];
        const norm2 = tf.norm(embedding2).dataSync()[0];
        
        return dotProduct / (norm1 * norm2);
    }

    /**
     * Calculate structural similarity
     */
    calculateStructuralSimilarity(content1, content2) {
        // Compare sentence structure
        const structure1 = this.extractSentenceStructure(content1.sentences);
        const structure2 = this.extractSentenceStructure(content2.sentences);
        
        let similarity = 0;
        const minLength = Math.min(structure1.length, structure2.length);
        
        for (let i = 0; i < minLength; i++) {
            similarity += this.compareSentencePatterns(structure1[i], structure2[i]);
        }
        
        return similarity / Math.max(structure1.length, structure2.length);
    }

    /**
     * Calculate syntactic similarity
     */
    calculateSyntacticSimilarity(content1, content2) {
        // Compare writing patterns
        const patterns1 = this.extractWritingPatterns(content1);
        const patterns2 = this.extractWritingPatterns(content2);
        
        let similarity = 0;
        const patternTypes = ['sentenceLength', 'wordLength', 'punctuation'];
        
        for (const patternType of patternTypes) {
            if (patterns1[patternType] && patterns2[patternType]) {
                similarity += this.comparePatterns(
                    patterns1[patternType], 
                    patterns2[patternType]
                );
            }
        }
        
        return similarity / patternTypes.length;
    }

    /**
     * Combine analysis results from different methods
     */
    combineAnalysisResults(analysisResults) {
        const combined = {
            overallSimilarity: 0,
            methodResults: analysisResults,
            suspiciousSubmissions: [],
            confidence: 0
        };

        // Weight different methods
        const weights = {
            lexical: 0.3,
            semantic: 0.4,
            structural: 0.2,
            syntactic: 0.1
        };

        // Combine similarities for each submission
        const submissionSimilarities = new Map();

        for (const result of analysisResults) {
            const weight = weights[result.method] || 0.25;
            
            for (const similarity of result.similarities) {
                if (!submissionSimilarities.has(similarity.submissionId)) {
                    submissionSimilarities.set(similarity.submissionId, {
                        submissionId: similarity.submissionId,
                        userId: similarity.userId,
                        similarities: {},
                        weightedScore: 0
                    });
                }
                
                const sub = submissionSimilarities.get(similarity.submissionId);
                sub.similarities[result.method] = similarity.similarity;
                sub.weightedScore += similarity.similarity * weight;
            }
        }

        // Find suspicious submissions
        for (const [submissionId, data] of submissionSimilarities) {
            if (data.weightedScore > this.config.similarityThreshold) {
                combined.suspiciousSubmissions.push({
                    ...data,
                    overallSimilarity: data.weightedScore
                });
            }
        }

        // Calculate overall similarity
        combined.overallSimilarity = Math.max(
            ...Array.from(submissionSimilarities.values()).map(s => s.weightedScore)
        );

        // Calculate confidence based on agreement between methods
        const agreements = this.calculateMethodAgreement(analysisResults);
        combined.confidence = agreements;

        return combined;
    }

    /**
     * Generate detailed plagiarism report
     */
    async generatePlagiarismReport(submission, analysis, comparisonSubmissions) {
        const report = {
            submissionId: submission.submissionId,
            userId: submission.userId,
            assignmentId: submission.assignmentId,
            timestamp: new Date().toISOString(),
            overallScore: analysis.overallSimilarity,
            isPlagiarized: analysis.overallSimilarity > this.config.similarityThreshold,
            confidence: analysis.confidence,
            suspiciousSubmissions: analysis.suspiciousSubmissions,
            methodResults: analysis.methodResults,
            detailedAnalysis: {
                topMatches: analysis.suspiciousSubmissions
                    .sort((a, b) => b.overallSimilarity - a.overallSimilarity)
                    .slice(0, 5),
                methodAgreement: this.calculateMethodAgreement(analysis.methodResults),
                riskLevel: this.calculateRiskLevel(analysis.overallSimilarity),
                recommendations: this.generateRecommendations(analysis)
            },
            metadata: {
                contentType: submission.contentType,
                wordCount: submission.content.split(/\s+/).length,
                processingTime: Date.now()
            }
        };

        return report;
    }

    /**
     * Calculate risk level based on similarity score
     */
    calculateRiskLevel(similarityScore) {
        if (similarityScore > 0.95) return 'critical';
        if (similarityScore > 0.90) return 'high';
        if (similarityScore > 0.85) return 'medium';
        if (similarityScore > 0.75) return 'low';
        return 'minimal';
    }

    /**
     * Generate recommendations based on analysis
     */
    generateRecommendations(analysis) {
        const recommendations = [];

        if (analysis.overallSimilarity > 0.95) {
            recommendations.push({
                type: 'immediate_action',
                priority: 'high',
                description: 'High probability of plagiarism - immediate review required',
                action: 'flag_for_review'
            });
        } else if (analysis.overallSimilarity > 0.85) {
            recommendations.push({
                type: 'investigation',
                priority: 'medium',
                description: 'Moderate probability of plagiarism - further investigation recommended',
                action: 'schedule_review'
            });
        }

        if (analysis.confidence < 0.7) {
            recommendations.push({
                type: 'verification',
                priority: 'low',
                description: 'Low confidence in detection results - manual verification recommended',
                action: 'manual_review'
            });
        }

        return recommendations;
    }

    /**
     * Helper methods
     */
    extractCodeTokens(content) {
        // Extract meaningful code tokens
        const tokenPattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
        return content.match(tokenPattern) || [];
    }

    extractCodeStructures(content) {
        return {
            functions: (content.match(/function\s+\w+/g) || []).length,
            classes: (content.match(/class\s+\w+/g) || []).length,
            loops: (content.match(/\b(for|while|do)\b/g) || []).length,
            conditionals: (content.match(/\b(if|else|switch)\b/g) || []).length
        };
    }

    calculateCyclomaticComplexity(content) {
        // Simplified cyclomatic complexity calculation
        const decisionPoints = (content.match(/\b(if|else|while|for|switch|case)\b/g) || []).length;
        return decisionPoints + 1;
    }

    extractSentenceStructure(sentences) {
        return sentences.map(sentence => ({
            length: sentence.split(/\s+/).length,
            words: this.tokenizer.tokenize(sentence.toLowerCase()),
            punctuation: sentence.match(/[.,;:!?]/g) || []
        }));
    }

    extractWritingPatterns(content) {
        const sentences = content.sentences;
        const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
        const wordLengths = content.tokens.map(t => t.length);
        
        return {
            sentenceLength: {
                mean: sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length,
                variance: this.calculateVariance(sentenceLengths)
            },
            wordLength: {
                mean: wordLengths.reduce((a, b) => a + b, 0) / wordLengths.length,
                variance: this.calculateVariance(wordLengths)
            },
            punctuation: this.analyzePunctuation(content.original)
        };
    }

    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    }

    analyzePunctuation(text) {
        const punctuation = text.match(/[.,;:!?]/g) || [];
        const counts = {};
        for (const char of punctuation) {
            counts[char] = (counts[char] || 0) + 1;
        }
        return counts;
    }

    compareSentencePatterns(structure1, structure2) {
        // Compare sentence patterns
        const lengthDiff = Math.abs(structure1.length - structure2.length);
        const maxLength = Math.max(structure1.length, structure2.length);
        const lengthSimilarity = 1 - (lengthDiff / maxLength);
        
        // Compare word patterns
        const words1 = new Set(structure1.words);
        const words2 = new Set(structure2.words);
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        const wordSimilarity = intersection.size / union.size;
        
        return (lengthSimilarity + wordSimilarity) / 2;
    }

    comparePatterns(pattern1, pattern2) {
        // Compare statistical patterns
        const meanDiff = Math.abs(pattern1.mean - pattern2.mean);
        const maxMean = Math.max(pattern1.mean, pattern2.mean);
        const meanSimilarity = 1 - (meanDiff / maxMean);
        
        const varianceDiff = Math.abs(pattern1.variance - pattern2.variance);
        const maxVariance = Math.max(pattern1.variance, pattern2.variance);
        const varianceSimilarity = 1 - (varianceDiff / maxVariance);
        
        return (meanSimilarity + varianceSimilarity) / 2;
    }

    calculateMethodAgreement(methodResults) {
        if (methodResults.length < 2) return 1;
        
        let totalAgreement = 0;
        let comparisons = 0;
        
        for (let i = 0; i < methodResults.length; i++) {
            for (let j = i + 1; j < methodResults.length; j++) {
                const method1 = methodResults[i];
                const method2 = methodResults[j];
                
                const agreement = this.calculateMethodSimilarity(method1, method2);
                totalAgreement += agreement;
                comparisons++;
            }
        }
        
        return totalAgreement / comparisons;
    }

    calculateMethodSimilarity(method1, method2) {
        // Compare similarity rankings between methods
        const rankings1 = method1.similarities
            .sort((a, b) => b.similarity - a.similarity)
            .map(s => s.submissionId);
        
        const rankings2 = method2.similarities
            .sort((a, b) => b.similarity - a.similarity)
            .map(s => s.submissionId);
        
        // Calculate Spearman correlation (simplified)
        let correlation = 0;
        const minLength = Math.min(rankings1.length, rankings2.length);
        
        for (let i = 0; i < minLength; i++) {
            if (rankings1[i] === rankings2[i]) {
                correlation++;
            }
        }
        
        return correlation / minLength;
    }

    // Cache management
    async getFromCache(key) {
        try {
            const cached = await this.redisClient.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            return null;
        }
    }

    async setCache(key, value, timeout = this.config.cacheTimeout) {
        try {
            await this.redisClient.setEx(
                key, 
                Math.ceil(timeout / 1000), 
                JSON.stringify(value)
            );
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    // File system helper
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    // Placeholder methods for database operations
    async getComparisonSubmissions(assignmentId, userId) {
        // Get submissions for comparison (excluding current user)
        return [];
    }

    async storePlagiarismAnalysis(submissionId, analysis) {
        // Store analysis in database
        console.log(`Stored plagiarism analysis for submission ${submissionId}`);
    }

    async performBasicSemanticAnalysis(content, comparisonSubmissions) {
        // Fallback semantic analysis using simpler methods
        return {
            method: 'semantic',
            similarities: [],
            maxSimilarity: 0,
            averageSimilarity: 0
        };
    }

    async preprocessMixedContent(content) {
        // Handle mixed text and code content
        const textParts = content.split(/```[\s\S]*?```/);
        const codeParts = content.match(/```[\s\S]*?```/g) || [];
        
        return {
            original: content,
            textParts: textParts.map(part => this.preprocessText(part)),
            codeParts: codeParts.map(part => this.preprocessCode(part)),
            cleaned: content,
            features: {
                textSections: textParts.length,
                codeSections: codeParts.length
            }
        };
    }
}

module.exports = new AdvancedPlagiarismDetector();
