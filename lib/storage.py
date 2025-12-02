"""
File storage utilities for handling teacher document uploads.
Supports Supabase Storage (primary) and AWS S3 (optional).
"""
import os
from typing import Optional, Dict, Any
from supabase import Client
from lib.supabase_client import get_supabase_client


class FileStorage:
    """Handles file storage for teacher uploads"""
    
    def __init__(self, provider: str = None):
        """
        Initialize file storage.
        
        Args:
            provider: Storage provider ('supabase' or 's3'). Defaults to env var.
        """
        self.provider = provider or os.getenv('STORAGE_PROVIDER', 'supabase')
        self.bucket_name = os.getenv('SUPABASE_STORAGE_BUCKET', 'documents')
        self.supabase: Optional[Client] = None
        
        if self.provider == 'supabase':
            self.supabase = get_supabase_client()
        elif self.provider == 's3':
            # S3 support can be added later
            raise NotImplementedError("S3 storage not yet implemented. Use 'supabase' provider.")
        else:
            raise ValueError(f"Unknown storage provider: {self.provider}")
    
    async def upload_file(
        self, 
        file_content: bytes, 
        filename: str, 
        content_type: str,
        folder: str = "teacher-documents"
    ) -> str:
        """
        Upload file to storage and return public URL.
        
        Args:
            file_content: File content as bytes
            filename: Name of the file (will be prefixed with folder)
            content_type: MIME type of the file
            folder: Folder path in storage bucket
            
        Returns:
            Public URL of the uploaded file
        """
        if self.provider == 'supabase':
            return await self._upload_to_supabase(file_content, filename, content_type, folder)
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")
    
    async def _upload_to_supabase(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        folder: str
    ) -> str:
        """Upload file to Supabase Storage"""
        if not self.supabase:
            raise ValueError("Supabase client not initialized")
        
        # Construct file path
        file_path = f"{folder}/{filename}"
        
        try:
            # Upload file to Supabase Storage
            result = self.supabase.storage.from_(self.bucket_name).upload(
                path=file_path,
                file=file_content,
                file_options={
                    "content-type": content_type,
                    "upsert": "false"  # Don't overwrite existing files
                }
            )
            
            # Check for errors
            if hasattr(result, 'error') and result.error:
                raise Exception(f"Storage upload error: {result.error}")
            
            # Construct public URL manually (Supabase Python client doesn't have get_public_url)
            supabase_url = os.getenv("SUPABASE_URL")
            if not supabase_url:
                raise ValueError("SUPABASE_URL environment variable not set")
            
            # Construct public URL
            public_url = f"{supabase_url}/storage/v1/object/public/{self.bucket_name}/{file_path}"
            return public_url
                
        except Exception as e:
            raise Exception(f"Failed to upload file to Supabase Storage: {str(e)}")
    
    async def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from storage.
        
        Args:
            file_path: Path to the file (relative to bucket root)
            
        Returns:
            True if successful, False otherwise
        """
        if self.provider == 'supabase':
            if not self.supabase:
                raise ValueError("Supabase client not initialized")
            
            try:
                result = self.supabase.storage.from_(self.bucket_name).remove([file_path])
                return True
            except Exception as e:
                print(f"Error deleting file: {e}")
                return False
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")
    
    async def get_presigned_url(
        self, 
        filename: str, 
        expiration: int = 3600,
        folder: str = "teacher-documents"
    ) -> Dict[str, Any]:
        """
        Get presigned URL for direct upload from frontend.
        
        Note: Supabase Storage doesn't support presigned PUT URLs like S3.
        Instead, we return upload endpoint info that frontend can use with auth.
        
        Args:
            filename: Name of the file
            expiration: URL expiration in seconds (not used for Supabase)
            folder: Folder path in storage bucket
            
        Returns:
            Dict with upload_url and headers
        """
        if self.provider == 'supabase':
            file_path = f"{folder}/{filename}"
            supabase_url = os.getenv("SUPABASE_URL")
            
            return {
                "upload_url": f"{supabase_url}/storage/v1/object/{self.bucket_name}/{file_path}",
                "path": file_path,
                "bucket": self.bucket_name,
                "headers": {
                    "Content-Type": "application/octet-stream"
                }
            }
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")


# Singleton instance
_storage_instance: Optional[FileStorage] = None

def get_storage() -> FileStorage:
    """Get or create storage instance"""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = FileStorage()
    return _storage_instance

