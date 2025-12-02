-- Seed data for initial testing
-- Run this after the initial schema migration

-- Insert sample math concepts
INSERT INTO public.math_concepts (concept_id, name, description, prerequisites, difficulty, topic_category)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Quadratic Equations', 'Equations of the form ax² + bx + c = 0', ARRAY[]::TEXT[], 'intermediate', 'algebra'),
    ('00000000-0000-0000-0000-000000000002', 'Pythagorean Theorem', 'a² + b² = c² for right triangles', ARRAY[]::TEXT[], 'beginner', 'geometry'),
    ('00000000-0000-0000-0000-000000000003', 'Derivatives', 'Rate of change of a function', ARRAY[]::TEXT[], 'advanced', 'calculus'),
    ('00000000-0000-0000-0000-000000000004', 'Linear Equations', 'Equations of the form y = mx + b', ARRAY[]::TEXT[], 'beginner', 'algebra'),
    ('00000000-0000-0000-0000-000000000005', 'Trigonometric Functions', 'Sine, cosine, and tangent functions', ARRAY[]::TEXT[], 'intermediate', 'trigonometry')
ON CONFLICT DO NOTHING;

-- Insert sample practice problems
INSERT INTO public.practice_problems (problem_id, concept_id, problem_text, solution, difficulty, hints)
VALUES
    (
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000000001',
        'Solve for x: x² - 5x + 6 = 0',
        'Using factoring: (x - 2)(x - 3) = 0, so x = 2 or x = 3',
        'intermediate',
        ARRAY['Try factoring the quadratic', 'Look for two numbers that multiply to 6 and add to -5', 'The solutions are x = 2 and x = 3']
    ),
    (
        '00000000-0000-0000-0000-000000000102',
        '00000000-0000-0000-0000-000000000002',
        'A right triangle has legs of length 3 and 4. What is the length of the hypotenuse?',
        'Using a² + b² = c²: 3² + 4² = 9 + 16 = 25, so c = 5',
        'beginner',
        ARRAY['Use the Pythagorean theorem', 'Square both legs and add them', 'Take the square root of the sum']
    ),
    (
        '00000000-0000-0000-0000-000000000103',
        '00000000-0000-0000-0000-000000000004',
        'Find the slope and y-intercept of the line: y = 2x + 3',
        'Slope (m) = 2, y-intercept (b) = 3',
        'beginner',
        ARRAY['The equation is in slope-intercept form y = mx + b', 'm is the coefficient of x', 'b is the constant term']
    )
ON CONFLICT DO NOTHING;

