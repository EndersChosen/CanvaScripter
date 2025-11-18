// Test file for name splitting logic

// Helper function to normalize quotes (convert curly/smart quotes to straight quotes)
function normalizeQuotes(text) {
    if (!text) return text;
    // Replace various quote characters with standard ASCII quotes
    return text
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')  // curly double quotes
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'"); // curly single quotes
}

function splitNameWithQuotes(fullName) {
    // First normalize any curly quotes to straight quotes
    const name = normalizeQuotes((fullName || '').trim());
    if (!name) return { firstName: '', lastName: '' };
    
    // Find all quoted sections
    const quotedSections = [];
    const quoteRegex = /"[^"]*"/g;
    let match;
    while ((match = quoteRegex.exec(name)) !== null) {
        quotedSections.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0]
        });
    }
    
    // If no quotes, use simple split
    if (quotedSections.length === 0) {
        const parts = name.split(/\s+/);
        return {
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || ''
        };
    }
    
    // Replace quoted sections with placeholders to split safely
    let safeName = name;
    const placeholders = [];
    quotedSections.reverse().forEach((section, index) => {
        const placeholder = `__QUOTE_${index}__`;
        placeholders.push({ placeholder, text: section.text });
        safeName = safeName.substring(0, section.start) + placeholder + safeName.substring(section.end);
    });
    
    // Split on whitespace
    const parts = safeName.split(/\s+/);
    
    // Restore quoted sections
    const restoredParts = parts.map(part => {
        const placeholderMatch = placeholders.find(p => part.includes(p.placeholder));
        if (placeholderMatch) {
            return part.replace(placeholderMatch.placeholder, placeholderMatch.text);
        }
        return part;
    });
    
    return {
        firstName: restoredParts[0] || '',
        lastName: restoredParts.slice(1).join(' ') || ''
    };
}

// Test cases
const testCases = [
    { input: '"Group Test User" 3', expectedFirst: '"Group Test User"', expectedLast: '3' },
    { input: 'First "This is my last name" bob', expectedFirst: 'First', expectedLast: '"This is my last name" bob' },
    { input: 'John Doe', expectedFirst: 'John', expectedLast: 'Doe' },
    { input: 'Jane', expectedFirst: 'Jane', expectedLast: '' },
    { input: 'Mary Jane Watson', expectedFirst: 'Mary', expectedLast: 'Jane Watson' },
    { input: '"Quoted First" "Quoted Last"', expectedFirst: '"Quoted First"', expectedLast: '"Quoted Last"' },
    // Test with curly quotes (smart quotes) - these should be normalized to straight quotes
    { input: '"Group Test User" 3', expectedFirst: '"Group Test User"', expectedLast: '3' },
    { input: 'First "This is my last name" bob', expectedFirst: 'First', expectedLast: '"This is my last name" bob' },
    { input: '"Quoted First" "Quoted Last"', expectedFirst: '"Quoted First"', expectedLast: '"Quoted Last"' },
];

console.log('Testing name splitting logic:\n');

testCases.forEach((test, index) => {
    const result = splitNameWithQuotes(test.input);
    const passed = result.firstName === test.expectedFirst && result.lastName === test.expectedLast;
    
    console.log(`Test ${index + 1}: ${passed ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Input: "${test.input}"`);
    console.log(`  Expected: firstName="${test.expectedFirst}", lastName="${test.expectedLast}"`);
    console.log(`  Got:      firstName="${result.firstName}", lastName="${result.lastName}"`);
    console.log('');
});
