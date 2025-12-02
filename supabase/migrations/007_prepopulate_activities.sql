-- ============================================================================
-- ACTIVITIES PREPOPULATE/REVERT SCRIPT
-- ============================================================================
-- This script can revert (delete) or prepopulate activities for test data
-- 
-- PREREQUISITES:
-- 1. Run the classroom/enrollment seed script first (006 or similar)
-- 2. Ensure classrooms exist with the expected names
-- 3. Get classroom IDs if needed by running:
--    SELECT classroom_id, name FROM public.classrooms WHERE name IN ('Algebra 101', 'Calculus Advanced', 'Geometry Basics');
-- ============================================================================

-- ============================================================================
-- REVERT SECTION - Delete all activities (uncomment to use)
-- ============================================================================
/*
DO $$
BEGIN
    -- Delete in correct order to respect foreign key constraints
    DELETE FROM public.student_responses;
    DELETE FROM public.activity_questions;
    DELETE FROM public.student_activities;
    DELETE FROM public.learning_activities;
    
    RAISE NOTICE 'All activities deleted';
END $$;
*/

-- ============================================================================
-- PREPOPULATE SECTION - Create activities for classrooms
-- ============================================================================

DO $$
DECLARE
    -- User IDs (from your actual database - same as seed script)
    teacher1_id UUID := 'a7af1162-55c7-4f14-9321-ae30332dc506';
    teacher2_id UUID := 'b7c99902-2441-47fd-9276-bd6620a5bc7f';
    
    -- Classroom IDs (will be fetched by name)
    classroom1_id UUID; -- Algebra 101
    classroom2_id UUID; -- Calculus Advanced
    classroom3_id UUID; -- Geometry Basics
    
    -- Activity IDs
    activity1_id UUID;
    activity2_id UUID;
    activity3_id UUID;
    activity4_id UUID;
    activity5_id UUID;
    
    -- Student IDs (for assigning activities)
    student1_id UUID := '7fa91761-72ed-4c67-bf12-9568ed1a8f44';
    student2_id UUID := '23993186-5cdd-473a-a967-fe0acf01927d';
    student3_id UUID;
    student4_id UUID;
    student5_id UUID;
    
BEGIN
    -- Get student IDs for students that might exist
    SELECT id INTO student3_id FROM auth.users WHERE email = 'student3@mathmentor.test' LIMIT 1;
    SELECT id INTO student4_id FROM auth.users WHERE email = 'student4@mathmentor.test' LIMIT 1;
    SELECT id INTO student5_id FROM auth.users WHERE email = 'student5@mathmentor.test' LIMIT 1;
    
    -- Get classroom IDs by name
    SELECT classroom_id INTO classroom1_id FROM public.classrooms WHERE name = 'Algebra 101' AND teacher_id = teacher1_id LIMIT 1;
    SELECT classroom_id INTO classroom2_id FROM public.classrooms WHERE name = 'Calculus Advanced' AND teacher_id = teacher2_id LIMIT 1;
    SELECT classroom_id INTO classroom3_id FROM public.classrooms WHERE name = 'Geometry Basics' AND teacher_id = teacher1_id LIMIT 1;
    
    -- Verify classrooms exist
    IF classroom1_id IS NULL THEN
        RAISE EXCEPTION 'Classroom "Algebra 101" not found. Please run the classroom seed script first.';
    END IF;
    
    IF classroom2_id IS NULL THEN
        RAISE EXCEPTION 'Classroom "Calculus Advanced" not found. Please run the classroom seed script first.';
    END IF;
    
    IF classroom3_id IS NULL THEN
        RAISE EXCEPTION 'Classroom "Geometry Basics" not found. Please run the classroom seed script first.';
    END IF;
    
    RAISE NOTICE 'Found classrooms: Algebra 101 (%), Calculus Advanced (%), Geometry Basics (%)', 
        classroom1_id, classroom2_id, classroom3_id;
    
    -- ========================================================================
    -- CREATE ACTIVITIES FOR ALGEBRA 101 (Classroom 1)
    -- ========================================================================
    
    -- Activity 1: Introduction to Linear Equations
    INSERT INTO public.learning_activities (
        teacher_id,
        classroom_id,
        title,
        description,
        activity_type,
        difficulty,
        estimated_time_minutes,
        learning_objectives,
        metadata
    ) VALUES (
        teacher1_id,
        classroom1_id,
        'Introduction to Linear Equations',
        'This comprehensive activity introduces students to the fundamental concepts of linear equations. Through interactive conversation, students will learn what linear equations are, how to identify them, and how to solve them step-by-step. The activity covers equations with one variable, explores the properties of equality, and teaches students to check their solutions. Students will practice solving equations involving addition, subtraction, multiplication, and division, and will learn to apply these skills to real-world word problems. The AI tutor will guide students through each concept, provide immediate feedback, and adapt the difficulty based on student responses.',
        'conversational',
        'beginner',
        45,
        ARRAY[
            'Define and identify linear equations in one variable',
            'Understand the properties of equality (addition, subtraction, multiplication, division)',
            'Solve linear equations using inverse operations',
            'Verify solutions by substitution',
            'Apply linear equations to solve word problems',
            'Recognize when an equation has one solution, no solution, or infinitely many solutions'
        ],
        jsonb_build_object(
            'topic', 'Linear Equations',
            'teaching_style', 'guided',
            'teaching_flow', 'Introduction → Teaching → Practice → Evaluation',
            'key_concepts', ARRAY['Equality', 'Inverse Operations', 'Isolation of Variables', 'Solution Verification'],
            'prerequisites', ARRAY['Basic arithmetic operations', 'Understanding of variables'],
            'assessment_criteria', ARRAY['Can solve equations with one variable', 'Can check solutions', 'Can set up equations from word problems'],
            'examples', ARRAY['2x + 5 = 13', '3(x - 4) = 15', 'Word problems involving age, distance, or money']
        )
    ) RETURNING activity_id INTO activity1_id;
    
    RAISE NOTICE 'Created Activity 1: Introduction to Linear Equations (%)', activity1_id;
    
    -- Activity 2: Systems of Equations
    INSERT INTO public.learning_activities (
        teacher_id,
        classroom_id,
        title,
        description,
        activity_type,
        difficulty,
        estimated_time_minutes,
        learning_objectives,
        metadata
    ) VALUES (
        teacher1_id,
        classroom1_id,
        'Systems of Linear Equations',
        'This activity deepens students'' understanding of linear relationships by introducing systems of equations. Students will learn to solve systems using multiple methods: graphing, substitution, and elimination. The activity covers systems with one solution, no solution, and infinitely many solutions. Students will practice identifying which method is most efficient for different types of systems and will learn to interpret solutions in real-world contexts such as finding intersection points, comparing rates, and solving mixture problems. The AI tutor will help students understand when to use each method and provide guidance on checking solutions.',
        'conversational',
        'intermediate',
        60,
        ARRAY[
            'Identify systems of linear equations',
            'Solve systems using the substitution method',
            'Solve systems using the elimination method',
            'Solve systems by graphing (conceptual understanding)',
            'Determine the number of solutions a system has',
            'Interpret solutions in the context of word problems',
            'Choose the most efficient method for a given system'
        ],
        jsonb_build_object(
            'topic', 'Systems of Equations',
            'teaching_style', 'guided',
            'teaching_flow', 'Introduction → Teaching → Practice → Evaluation',
            'key_concepts', ARRAY['Substitution Method', 'Elimination Method', 'Consistent vs Inconsistent Systems', 'Dependent vs Independent Systems'],
            'prerequisites', ARRAY['Solving linear equations', 'Understanding of ordered pairs', 'Basic graphing concepts'],
            'assessment_criteria', ARRAY['Can solve systems using substitution', 'Can solve systems using elimination', 'Can identify solution types', 'Can apply systems to word problems'],
            'examples', ARRAY['x + y = 5 and 2x - y = 1', '3x + 2y = 12 and x - y = 1', 'Word problems with two variables']
        )
    ) RETURNING activity_id INTO activity2_id;
    
    RAISE NOTICE 'Created Activity 2: Systems of Equations (%)', activity2_id;
    
    -- ========================================================================
    -- CREATE ACTIVITIES FOR CALCULUS ADVANCED (Classroom 2)
    -- ========================================================================
    
    -- Activity 3: Derivatives and Applications
    INSERT INTO public.learning_activities (
        teacher_id,
        classroom_id,
        title,
        description,
        activity_type,
        difficulty,
        estimated_time_minutes,
        learning_objectives,
        metadata
    ) VALUES (
        teacher2_id,
        classroom2_id,
        'Derivatives: Concepts, Rules, and Applications',
        'This advanced activity provides a comprehensive exploration of derivatives, one of the fundamental concepts in calculus. Students will develop an intuitive understanding of derivatives as rates of change and slopes of tangent lines. The activity covers all major derivative rules including the power rule, product rule, quotient rule, and chain rule. Students will learn to find derivatives of polynomial, rational, exponential, logarithmic, and trigonometric functions. The activity emphasizes real-world applications including finding maximum and minimum values, optimization problems, related rates, and curve sketching. Through Socratic questioning, the AI tutor will help students understand the "why" behind each rule and develop problem-solving strategies.',
        'conversational',
        'advanced',
        90,
        ARRAY[
            'Understand derivatives as limits and rates of change',
            'Master the power rule, product rule, quotient rule, and chain rule',
            'Find derivatives of polynomial, rational, exponential, and trigonometric functions',
            'Apply derivatives to find critical points and extrema',
            'Solve optimization problems using derivatives',
            'Use derivatives to analyze function behavior (increasing/decreasing, concavity)',
            'Apply derivatives to related rates problems',
            'Interpret derivatives in real-world contexts (velocity, acceleration, marginal cost)'
        ],
        jsonb_build_object(
            'topic', 'Derivatives',
            'teaching_style', 'socratic',
            'teaching_flow', 'Introduction → Teaching → Practice → Evaluation',
            'key_concepts', ARRAY['Limit Definition', 'Power Rule', 'Product Rule', 'Quotient Rule', 'Chain Rule', 'Critical Points', 'First and Second Derivative Tests', 'Optimization'],
            'prerequisites', ARRAY['Limits', 'Continuity', 'Understanding of functions', 'Basic algebra'],
            'assessment_criteria', ARRAY['Can apply derivative rules correctly', 'Can find critical points', 'Can solve optimization problems', 'Can interpret derivatives in context'],
            'examples', ARRAY['f(x) = x^3 + 2x^2 - 5x + 1', 'f(x) = (x^2 + 1)/(x - 1)', 'f(x) = e^x * sin(x)', 'Optimization: maximize area with fixed perimeter']
        )
    ) RETURNING activity_id INTO activity3_id;
    
    RAISE NOTICE 'Created Activity 3: Derivatives and Applications (%)', activity3_id;
    
    -- Activity 4: Integration Techniques
    INSERT INTO public.learning_activities (
        teacher_id,
        classroom_id,
        title,
        description,
        activity_type,
        difficulty,
        estimated_time_minutes,
        learning_objectives,
        metadata
    ) VALUES (
        teacher2_id,
        classroom2_id,
        'Integration Techniques and Applications',
        'This comprehensive activity covers the fundamental techniques of integration, the inverse operation of differentiation. Students will learn to recognize when to apply different integration methods and develop strategies for solving complex integrals. The activity covers basic antiderivatives, u-substitution (including trigonometric substitution), integration by parts, partial fractions, and improper integrals. Students will practice evaluating both indefinite and definite integrals, understand the Fundamental Theorem of Calculus, and apply integration to find areas under curves, volumes of revolution, and work done. The AI tutor will guide students through pattern recognition and help them develop intuition for choosing the right technique.',
        'conversational',
        'advanced',
        90,
        ARRAY[
            'Understand integration as the inverse of differentiation',
            'Find antiderivatives of basic functions',
            'Apply u-substitution to evaluate integrals',
            'Use integration by parts for products of functions',
            'Apply partial fractions to rational functions',
            'Evaluate definite integrals using the Fundamental Theorem of Calculus',
            'Calculate areas under curves and between curves',
            'Apply integration to find volumes of revolution',
            'Solve problems involving work, distance, and accumulation'
        ],
        jsonb_build_object(
            'topic', 'Integration',
            'teaching_style', 'guided',
            'teaching_flow', 'Introduction → Teaching → Practice → Evaluation',
            'key_concepts', ARRAY['Antiderivatives', 'U-Substitution', 'Integration by Parts', 'Partial Fractions', 'Fundamental Theorem of Calculus', 'Area Under Curves', 'Volumes of Revolution'],
            'prerequisites', ARRAY['Derivatives', 'Understanding of functions', 'Algebraic manipulation'],
            'assessment_criteria', ARRAY['Can identify appropriate integration technique', 'Can apply u-substitution correctly', 'Can use integration by parts', 'Can evaluate definite integrals', 'Can apply integration to area and volume problems'],
            'examples', ARRAY['∫(2x + 3)dx', '∫x*e^x dx', '∫(x^2 + 1)/(x - 1) dx', 'Area between y = x^2 and y = x']
        )
    ) RETURNING activity_id INTO activity4_id;
    
    RAISE NOTICE 'Created Activity 4: Integration Techniques (%)', activity4_id;
    
    -- ========================================================================
    -- CREATE ACTIVITIES FOR GEOMETRY BASICS (Classroom 3)
    -- ========================================================================
    
    -- Activity 5: Triangles and Pythagorean Theorem
    INSERT INTO public.learning_activities (
        teacher_id,
        classroom_id,
        title,
        description,
        activity_type,
        difficulty,
        estimated_time_minutes,
        learning_objectives,
        metadata
    ) VALUES (
        teacher1_id,
        classroom3_id,
        'Triangles and the Pythagorean Theorem',
        'This foundational geometry activity introduces students to triangles and one of the most important theorems in mathematics: the Pythagorean theorem. Students will learn to classify triangles by sides (scalene, isosceles, equilateral) and by angles (acute, right, obtuse). The activity thoroughly covers the Pythagorean theorem, including its statement, proof concepts, and applications. Students will practice finding missing sides in right triangles, identifying right triangles, and applying the theorem to solve real-world problems involving distance, height, and diagonal measurements. The activity also introduces the converse of the Pythagorean theorem and Pythagorean triples. The AI tutor will help students visualize geometric relationships and develop problem-solving strategies.',
        'conversational',
        'beginner',
        45,
        ARRAY[
            'Classify triangles by sides and angles',
            'Understand the Pythagorean theorem and its converse',
            'Apply the Pythagorean theorem to find missing sides in right triangles',
            'Identify right triangles using the converse of the Pythagorean theorem',
            'Recognize and use Pythagorean triples',
            'Apply the Pythagorean theorem to solve real-world problems',
            'Understand the relationship between the sides of a right triangle',
            'Solve problems involving distance, height, and diagonal measurements'
        ],
        jsonb_build_object(
            'topic', 'Triangles',
            'teaching_style', 'guided',
            'teaching_flow', 'Introduction → Teaching → Practice → Evaluation',
            'key_concepts', ARRAY['Triangle Classification', 'Right Triangles', 'Pythagorean Theorem', 'Converse of Pythagorean Theorem', 'Pythagorean Triples', 'Applications to Real-World Problems'],
            'prerequisites', ARRAY['Basic geometry concepts', 'Understanding of angles', 'Square roots'],
            'assessment_criteria', ARRAY['Can classify triangles', 'Can apply Pythagorean theorem', 'Can identify right triangles', 'Can solve word problems using the theorem'],
            'examples', ARRAY['Find hypotenuse: legs 3 and 4', 'Find leg: hypotenuse 10, leg 6', 'Is triangle with sides 5, 12, 13 a right triangle?', 'Ladder problem: 10 ft ladder, 6 ft from wall']
        )
    ) RETURNING activity_id INTO activity5_id;
    
    RAISE NOTICE 'Created Activity 5: Triangles and Pythagorean Theorem (%)', activity5_id;
    
    -- ========================================================================
    -- ASSIGN ACTIVITIES TO STUDENTS BASED ON ENROLLMENTS
    -- ========================================================================
    
    -- Assign Activity 1 (Linear Equations) to all students in Algebra 101
    IF student1_id IS NOT NULL THEN
        INSERT INTO public.student_activities (
            activity_id,
            student_id,
            status
        ) VALUES (
            activity1_id,
            student1_id,
            'assigned'
        ) ON CONFLICT (activity_id, student_id) DO NOTHING;
        RAISE NOTICE 'Assigned Activity 1 to student1';
    END IF;
    
    IF student2_id IS NOT NULL THEN
        INSERT INTO public.student_activities (
            activity_id,
            student_id,
            status
        ) VALUES (
            activity1_id,
            student2_id,
            'assigned'
        ) ON CONFLICT (activity_id, student_id) DO NOTHING;
        RAISE NOTICE 'Assigned Activity 1 to student2';
    END IF;
    
    IF student3_id IS NOT NULL THEN
        INSERT INTO public.student_activities (
            activity_id,
            student_id,
            status
        ) VALUES (
            activity1_id,
            student3_id,
            'assigned'
        ) ON CONFLICT (activity_id, student_id) DO NOTHING;
        RAISE NOTICE 'Assigned Activity 1 to student3';
    END IF;
    
    -- Assign Activity 2 (Systems of Equations) to student1 and student2 in Algebra 101
    IF student1_id IS NOT NULL THEN
        INSERT INTO public.student_activities (
            activity_id,
            student_id,
            status
        ) VALUES (
            activity2_id,
            student1_id,
            'assigned'
        ) ON CONFLICT (activity_id, student_id) DO NOTHING;
        RAISE NOTICE 'Assigned Activity 2 to student1';
    END IF;
    
    IF student2_id IS NOT NULL THEN
        INSERT INTO public.student_activities (
            activity_id,
            student_id,
            status
        ) VALUES (
            activity2_id,
            student2_id,
            'assigned'
        ) ON CONFLICT (activity_id, student_id) DO NOTHING;
        RAISE NOTICE 'Assigned Activity 2 to student2';
    END IF;
    
    -- Assign Activity 3 (Derivatives) to all students in Calculus Advanced
    IF student3_id IS NOT NULL THEN
        INSERT INTO public.student_activities (
            activity_id,
            student_id,
            status
        ) VALUES (
            activity3_id,
            student3_id,
            'assigned'
        ) ON CONFLICT (activity_id, student_id) DO NOTHING;
        RAISE NOTICE 'Assigned Activity 3 to student3';
    END IF;
    
    IF student4_id IS NOT NULL THEN
        INSERT INTO public.student_activities (
            activity_id,
            student_id,
            status
        ) VALUES (
            activity3_id,
            student4_id,
            'assigned'
        ) ON CONFLICT (activity_id, student_id) DO NOTHING;
        RAISE NOTICE 'Assigned Activity 3 to student4';
    END IF;
    
    IF student5_id IS NOT NULL THEN
        INSERT INTO public.student_activities (
            activity_id,
            student_id,
            status
        ) VALUES (
            activity3_id,
            student5_id,
            'assigned'
        ) ON CONFLICT (activity_id, student_id) DO NOTHING;
        RAISE NOTICE 'Assigned Activity 3 to student5';
    END IF;
    
    -- Assign Activity 4 (Integration) to student3 and student4 in Calculus Advanced
    IF student3_id IS NOT NULL THEN
        INSERT INTO public.student_activities (
            activity_id,
            student_id,
            status
        ) VALUES (
            activity4_id,
            student3_id,
            'assigned'
        ) ON CONFLICT (activity_id, student_id) DO NOTHING;
        RAISE NOTICE 'Assigned Activity 4 to student3';
    END IF;
    
    IF student4_id IS NOT NULL THEN
        INSERT INTO public.student_activities (
            activity_id,
            student_id,
            status
        ) VALUES (
            activity4_id,
            student4_id,
            'assigned'
        ) ON CONFLICT (activity_id, student_id) DO NOTHING;
        RAISE NOTICE 'Assigned Activity 4 to student4';
    END IF;
    
    -- Assign Activity 5 (Triangles) to all students in Geometry Basics
    IF student1_id IS NOT NULL THEN
        INSERT INTO public.student_activities (
            activity_id,
            student_id,
            status
        ) VALUES (
            activity5_id,
            student1_id,
            'assigned'
        ) ON CONFLICT (activity_id, student_id) DO NOTHING;
        RAISE NOTICE 'Assigned Activity 5 to student1';
    END IF;
    
    IF student2_id IS NOT NULL THEN
        INSERT INTO public.student_activities (
            activity_id,
            student_id,
            status
        ) VALUES (
            activity5_id,
            student2_id,
            'assigned'
        ) ON CONFLICT (activity_id, student_id) DO NOTHING;
        RAISE NOTICE 'Assigned Activity 5 to student2';
    END IF;
    
    RAISE NOTICE 'Activities prepopulation complete!';
    
END $$;

-- ============================================================================
-- VERIFY DATA
-- ============================================================================
-- Run these queries to verify the activities were created:

-- View all activities with classroom info
SELECT 
    la.activity_id,
    la.title,
    la.activity_type,
    la.difficulty,
    c.name as classroom_name,
    u.email as teacher_email,
    COUNT(DISTINCT sa.student_id) as assigned_students
FROM public.learning_activities la
JOIN public.classrooms c ON c.classroom_id = la.classroom_id
JOIN auth.users u ON u.id = la.teacher_id
LEFT JOIN public.student_activities sa ON sa.activity_id = la.activity_id
GROUP BY la.activity_id, la.title, la.activity_type, la.difficulty, c.name, u.email
ORDER BY c.name, la.created_at;

-- View student activities
SELECT 
    c.name as classroom_name,
    la.title as activity_title,
    u.email as student_email,
    sa.status,
    sa.started_at,
    sa.completed_at
FROM public.student_activities sa
JOIN public.learning_activities la ON la.activity_id = sa.activity_id
JOIN public.classrooms c ON c.classroom_id = la.classroom_id
JOIN auth.users u ON u.id = sa.student_id
ORDER BY c.name, la.title, u.email;

