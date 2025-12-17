"""
Track student progress and mastery.
"""
from typing import Dict, Any, List, Optional
from lib.supabase_client import get_supabase_client
from datetime import datetime


class ProgressTracker:
    """
    Tracks student progress, mastery, and learning paths.
    """
    
    def __init__(self):
        """Initialize progress tracker."""
        self.supabase = get_supabase_client()
    
    def update_mastery(
        self,
        user_id: str,
        concept_id: str,
        mastery_score: float
    ) -> bool:
        """
        Update mastery score for a concept.
        
        Args:
            user_id: User ID
            concept_id: Concept ID
            mastery_score: Score between 0.0 and 1.0
            
        Returns:
            True if successful
        """
        try:
            # Check if record exists
            existing = self.supabase.table('concepts_mastered').select('*').eq('user_id', user_id).eq('concept_id', concept_id).execute()
            
            mastery_data = {
                'user_id': user_id,
                'concept_id': concept_id,
                'mastery_score': min(max(mastery_score, 0.0), 1.0),
                'last_practiced': datetime.now().isoformat(),
                'times_practiced': 1
            }
            
            if existing.data:
                # Update existing
                mastery_data['times_practiced'] = existing.data[0].get('times_practiced', 0) + 1
                self.supabase.table('concepts_mastered').update(mastery_data).eq('user_id', user_id).eq('concept_id', concept_id).execute()
            else:
                # Insert new
                self.supabase.table('concepts_mastered').insert(mastery_data).execute()
            
            return True
        except Exception as e:
            print(f"Error updating mastery: {e}")
            return False
    
    def get_progress(self, user_id: str) -> Dict[str, Any]:
        """
        Get user's overall progress.
        
        Args:
            user_id: User ID
            
        Returns:
            Progress summary
        """
        try:
            # Get all mastered concepts
            result = self.supabase.table('concepts_mastered').select('*, math_concepts(*)').eq('user_id', user_id).execute()
            
            concepts = result.data if result.data else []
            
            total_concepts = len(concepts)
            mastered = sum(1 for c in concepts if c.get('mastery_score', 0) >= 0.8)
            in_progress = sum(1 for c in concepts if 0.3 <= c.get('mastery_score', 0) < 0.8)
            
            return {
                'total_concepts_studied': total_concepts,
                'mastered': mastered,
                'in_progress': in_progress,
                'not_started': 0,  # Would need total concepts count
                'concepts': concepts
            }
        except Exception as e:
            print(f"Error getting progress: {e}")
            return {
                'total_concepts_studied': 0,
                'mastered': 0,
                'in_progress': 0,
                'not_started': 0,
                'concepts': []
            }
    
    def get_recommendations(self, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get recommended next concepts to study.
        
        Args:
            user_id: User ID
            limit: Number of recommendations
            
        Returns:
            List of recommended concepts
        """
        try:
            # Get user's mastered concepts
            progress = self.get_progress(user_id)
            mastered_concept_ids = [c['concept_id'] for c in progress['concepts'] if c.get('mastery_score', 0) >= 0.8]
            
            # Get all concepts
            all_concepts = self.supabase.table('math_concepts').select('*').execute()
            
            if not all_concepts.data:
                return []
            
            # Filter out already mastered and find concepts with prerequisites met
            recommendations = []
            for concept in all_concepts.data:
                if concept['concept_id'] in mastered_concept_ids:
                    continue
                
                # Check prerequisites (simplified - in production, check prerequisite mastery)
                prerequisites = concept.get('prerequisites', [])
                if not prerequisites or all(prereq_id in mastered_concept_ids for prereq_id in prerequisites):
                    recommendations.append(concept)
            
            # Sort by difficulty and return top recommendations
            recommendations.sort(key=lambda x: {'beginner': 1, 'intermediate': 2, 'advanced': 3}.get(x.get('difficulty', 'intermediate'), 2))
            
            return recommendations[:limit]
        except Exception as e:
            print(f"Error getting recommendations: {e}")
            return []
    
    def record_practice_session(
        self,
        user_id: str,
        concept_id: Optional[str],
        problems_attempted: int,
        problems_correct: int
    ) -> Optional[str]:
        """
        Record a practice session.
        
        Args:
            user_id: User ID
            concept_id: Optional concept ID
            problems_attempted: Number of problems attempted
            problems_correct: Number of problems correct
            
        Returns:
            Session ID if successful
        """
        try:
            accuracy = (problems_correct / problems_attempted * 100) if problems_attempted > 0 else 0
            
            session_data = {
                'user_id': user_id,
                'concept_id': concept_id,
                'problems_attempted': problems_attempted,
                'problems_correct': problems_correct,
                'accuracy': accuracy,
                'started_at': datetime.now().isoformat(),
                'completed_at': datetime.now().isoformat()
            }
            
            result = self.supabase.table('practice_sessions').insert(session_data).execute()
            
            if result.data:
                # Update mastery based on session performance
                if concept_id and accuracy >= 80:
                    self.update_mastery(user_id, concept_id, min(accuracy / 100, 1.0))
                
                return result.data[0]['session_id']
        except Exception as e:
            print(f"Error recording session: {e}")
        
        return None












