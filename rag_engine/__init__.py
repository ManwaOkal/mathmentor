"""
RAG engine module for MathMentor.
Handles retrieval and generation of math tutoring responses.
"""
from .retriever import ContentRetriever
from .generator import ResponseGenerator
from .prompts import (
    format_tutor_prompt,
    format_concept_explanation,
    format_problem_solving
)

__all__ = [
    'ContentRetriever',
    'ResponseGenerator',
    'format_tutor_prompt',
    'format_concept_explanation',
    'format_problem_solving'
]









