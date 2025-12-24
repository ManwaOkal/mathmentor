"""
LaTeX formatting fixer for AI-generated responses.
Fixes common LaTeX formatting issues where the AI incorrectly mixes delimiters.
"""
import re


def fix_latex_formatting(text: str) -> str:
    """
    Fix common LaTeX formatting issues in AI responses.
    
    Examples of fixes:
    - $m = $\frac{y_2 - y_1}${x_2 - x_1}$ → $m = \frac{y_2 - y_1}{x_2 - x_1}$
    - m = \frac{3}{4} → $m = \frac{3}{4}$
    - Multiple $ signs in a row → Single $
    """
    if not text:
        return text
    
    # Fix: $...$\frac{...}$...$ pattern (most common bug)
    # Example: $m = $\frac{y_2 - y_1}${x_2 - x_1}$ → $m = \frac{y_2 - y_1}{x_2 - x_1}$
    pattern = r'\$\s*([^$]+?)\s*\$\s*\\frac\s*\{([^}]+)\}\s*\$\s*\{([^}]+)\}\s*\$'
    replacement = r'$\1\frac{\2}{\3}$'
    text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    # Fix: $$...$$\frac{...}$$...$$ pattern (display math version)
    pattern = r'\$\$\s*([^$]+?)\s*\$\$\s*\\frac\s*\{([^}]+)\}\s*\$\$\s*\{([^}]+)\}\s*\$\$'
    replacement = r'$$\1\frac{\2}{\3}$$'
    text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    # Fix: Missing $ around \frac when it's standalone
    # Example: m = \frac{3}{4} → $m = \frac{3}{4}$
    # But be careful not to wrap things that are already wrapped
    pattern = r'(?<!\$)(?<![\\])([a-zA-Z0-9_]+)\s*=\s*\\frac\{([^}]+)\}\{([^}]+)\}(?!\$)(?![a-zA-Z0-9_])'
    replacement = r'$\1 = \frac{\2}{\3}$'
    text = re.sub(pattern, replacement, text)
    
    # Fix: Multiple consecutive $ signs
    pattern = r'\$\s*\$+'
    text = re.sub(pattern, '$', text)
    
    # Fix: $ inside $ delimiters (nested $ signs)
    # Example: $x = $\frac{1}{2}$ → $x = \frac{1}{2}$
    pattern = r'\$([^$]*)\$([^$]*)\$'
    def fix_nested_dollars(match):
        inner = match.group(1) + match.group(2)
        # Only fix if it looks like a math expression
        if '\\frac' in inner or '\\sqrt' in inner or any(op in inner for op in ['+', '-', '*', '=', '^', '_']):
            return f'${inner}$'
        return match.group(0)
    
    # Apply nested dollar fix multiple times to catch all cases
    for _ in range(3):  # Max 3 iterations to avoid infinite loops
        new_text = re.sub(pattern, fix_nested_dollars, text)
        if new_text == text:
            break
        text = new_text
    
    # Fix: \frac without proper delimiters in the middle of text
    # Example: The slope is \frac{3}{4} → The slope is $\frac{3}{4}$
    pattern = r'([^\$])\\frac\{([^}]+)\}\{([^}]+)\}([^\$])'
    replacement = r'\1$\frac{\2}{\3}$\4'
    text = re.sub(pattern, replacement, text)
    
    # Fix: Broken fractions with extra $ signs
    # Example: $\frac{a}{b}$ → $frac{a}{b}$ (if somehow broken)
    pattern = r'\$\\frac\{([^}]+)\}\{([^}]+)\}\$'
    # This should already be correct, but ensure it's properly formatted
    text = re.sub(pattern, r'$\frac{\1}{\2}$', text)
    
    # Fix: \times without proper delimiters
    # Example: 2\times2 matrix → $2\times2$ matrix
    # Match patterns like: number\timesnumber, letter\timesletter, etc.
    # Process in order: simple patterns first, then more complex
    text = re.sub(r'(?<!\$)(\d+)\\times(\d+)', r'$\1\\times\2$', text)
    text = re.sub(r'(?<!\$)([A-Za-z])\\times([A-Za-z])', r'$\1\\times\2$', text)
    text = re.sub(r'(?<!\$)(\d+)\\times([A-Za-z])', r'$\1\\times\2$', text)
    text = re.sub(r'(?<!\$)([A-Za-z])\\times(\d+)', r'$\1\\times\2$', text)
    # Catch \times in context like "2\times2 matrix" or "A\times B" - wrap just the math part
    text = re.sub(r'(?<!\$)([^\s$]+)\\times([^\s$]+)(?=\s|$|\.|,|;|:|\))', r'$\1\\times\2$', text)
    
    # Fix: \cdot without proper delimiters
    text = re.sub(r'(?<!\$)(\d+)\\cdot(\d+)', r'$\1\\cdot\2$', text)
    text = re.sub(r'(?<!\$)([A-Za-z])\\cdot([A-Za-z])', r'$\1\\cdot\2$', text)
    
    return text


def test_latex_fixer():
    """Test function to verify LaTeX fixes."""
    test_cases = [
        {
            "input": "$m = $\frac{y_2 - y_1}${x_2 - x_1}$",
            "expected": "$m = \frac{y_2 - y_1}{x_2 - x_1}$"
        },
        {
            "input": "Calculate: $x = $\frac{-b}${2a}$",
            "expected": "Calculate: $x = \frac{-b}{2a}$"
        },
        {
            "input": "The slope is m = \frac{3}{4}",
            "expected": "The slope is $m = \frac{3}{4}$"
        },
        {
            "input": "$$f(x) = $\frac{1}${x^2}$$",
            "expected": "$$f(x) = \frac{1}{x^2}$$"
        },
        {
            "input": "Use the formula: $a = $\frac{b}${c}$",
            "expected": "Use the formula: $a = \frac{b}{c}$"
        }
    ]
    
    print("Testing LaTeX Fixer:")
    print("=" * 60)
    
    for i, test in enumerate(test_cases, 1):
        result = fix_latex_formatting(test["input"])
        match = result == test["expected"]
        print(f"\nTest {i}:")
        print(f"Input:    {test['input']}")
        print(f"Expected: {test['expected']}")
        print(f"Result:   {result}")
        print(f"Match:    {'✅ PASS' if match else '❌ FAIL'}")
        if not match:
            print(f"Difference: Expected '{test['expected']}' but got '{result}'")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    test_latex_fixer()






