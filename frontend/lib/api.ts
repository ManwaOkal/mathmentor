/**
 * API client for MathMentor backend with caching and performance optimizations
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const REQUEST_TIMEOUT = 30000 // 30 seconds
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes for GET requests
const LONG_REQUEST_TIMEOUT = 120000 // 2 minutes for AI generation requests

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class ApiClient {
  private baseUrl: string
  private cache: Map<string, CacheEntry<any>> = new Map()
  private pendingRequests: Map<string, Promise<any>> = new Map()
  private cacheCleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Normalize baseUrl: remove trailing slash to prevent double slashes
    this.baseUrl = API_URL.replace(/\/+$/, '')
    // Clean cache every 10 minutes (only in browser environment)
    if (typeof window !== 'undefined') {
      this.cacheCleanupInterval = setInterval(() => this.cleanCache(), 10 * 60 * 1000)
    }
  }

  // Cleanup method to clear intervals (useful for testing or cleanup)
  cleanup() {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval)
      this.cacheCleanupInterval = null
    }
  }

  private cleanCache() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  private getCacheKey(endpoint: string, body?: any): string {
    return `${endpoint}:${body ? JSON.stringify(body) : ''}`
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  private setCache<T>(key: string, data: T, ttl: number = CACHE_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = false,
    cacheTTL?: number
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const cacheKey = this.getCacheKey(endpoint, options.body)
    
    // Check cache for GET requests
    if (useCache && options.method === 'GET' || !options.method) {
      const cached = this.getCached<T>(cacheKey)
      if (cached !== null) {
        return cached
      }
    }

    // Check for pending request (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<T>
    }

    // Convert headers to plain object if needed
    let headersObj: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // Handle different header types
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headersObj[key] = value
        })
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headersObj[key] = value
        })
      } else {
        // It's already a Record<string, string>
        headersObj = { ...headersObj, ...options.headers as Record<string, string> }
      }
    }
    
    const headers = headersObj

    // Add auth header with Supabase session token
    console.log('Getting auth token for request to:', endpoint)
    const token = await this.getAuthToken()
    console.log('Auth token result:', token ? `Token exists (length: ${token.length})` : 'No token')
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      console.log('Adding auth header with token')
    } else {
      console.warn('No authentication token available - request may fail')
    }

    // Create request promise with timeout
    const requestPromise = (async () => {
      try {
        const controller = new AbortController()
        // Use longer timeout for document list polling (60 seconds) or AI generation (2 minutes)
        const isDocumentListPoll = endpoint.includes('/documents/') && (!options.method || options.method === 'GET')
        const isAIGeneration = endpoint.includes('/activities/conversational') || endpoint.includes('/test-teaching-flow')
        const timeout = isDocumentListPoll ? 60000 : (isAIGeneration ? LONG_REQUEST_TIMEOUT : REQUEST_TIMEOUT)
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        console.log('Making request to:', url, 'with headers:', Object.keys(headers))
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
          keepalive: false, // Disable keepalive to prevent connection leaks
        })

        clearTimeout(timeoutId)
        console.log('Response received:', response.status, response.statusText)

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: response.statusText }))
          console.error('Request failed:', response.status, error)
          throw new Error(error.detail || `HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log('Request successful, data received')
        
        // Cache successful GET requests
        if (useCache && (options.method === 'GET' || !options.method)) {
          this.setCache(cacheKey, data, cacheTTL)
        }

        return data as T
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout - please try again')
        }
        throw error
      } finally {
        // Remove from pending requests
        this.pendingRequests.delete(cacheKey)
      }
    })()

    // Store pending request for deduplication
    this.pendingRequests.set(cacheKey, requestPromise)

    return requestPromise
  }

  private async getAuthToken(): Promise<string | null> {
    // This method should not be called directly - components should pass token from useAuth context
    // Keeping as fallback for backward compatibility, but it will timeout
    if (typeof window !== 'undefined') {
      try {
        console.warn('getAuthToken: Called without token parameter - this may hang. Use session from useAuth context instead.')
        const { supabase } = await import('./supabase')
        
        // Use getSession() with a timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 2000)
        )
        
        let sessionResult
        try {
          sessionResult = await Promise.race([sessionPromise, timeoutPromise])
        } catch (timeoutError) {
          console.error('getAuthToken: Session check timed out - use session from useAuth context instead')
          return null
        }
        
        const { data: { session }, error } = sessionResult as any
        
        if (error || !session) {
          return null
        }
        
        const token = session.access_token
        if (!token || token.split('.').length !== 3) {
          return null
        }
        
        return token
      } catch (error) {
        console.error('Error getting auth token:', error)
        return null
      }
    }
    return null
  }

  private getUserId(): string | null {
    // Deprecated: Do not use localStorage. Use session from useAuth context instead.
    // Keeping for backward compatibility only - will be removed
    console.warn('getUserId() is deprecated - use session from useAuth context instead')
    return null
  }

  async askQuestion(question: string, conceptId?: string): Promise<QuestionResponse> {
    // Use keepalive for better performance and abort signal support
    return this.request<QuestionResponse>('/api/ask-question', {
      method: 'POST',
      body: JSON.stringify({
        question,
        concept_id: conceptId || null,
      }),
      keepalive: true, // Keep connection alive for faster subsequent requests
    }, false) // Don't cache questions
  }

  async explainConcept(conceptName: string, conceptId?: string): Promise<any> {
    // Cache explanations for 10 minutes
    return this.request('/api/explain-concept', {
      method: 'POST',
      body: JSON.stringify({
        concept_name: conceptName,
        concept_id: conceptId || null,
      }),
    }, true, 10 * 60 * 1000)
  }

  async solveProblem(problem: string, conceptId?: string): Promise<any> {
    return this.request('/api/solve-problem', {
      method: 'POST',
      body: JSON.stringify({
        problem,
        concept_id: conceptId || null,
      }),
    }, false)
  }

  async getHint(
    problem: string,
    attempt: string,
    hintLevel: number = 1,
    conceptId?: string
  ): Promise<any> {
    return this.request('/api/get-hint', {
      method: 'POST',
      body: JSON.stringify({
        problem,
        attempt,
        hint_level: hintLevel,
        concept_id: conceptId || null,
      }),
    }, false)
  }

  async generatePractice(
    conceptName: string,
    difficulty: string = 'intermediate',
    numProblems: number = 1,
    conceptId?: string
  ): Promise<any> {
    return this.request('/api/generate-practice', {
      method: 'POST',
      body: JSON.stringify({
        concept_name: conceptName,
        difficulty,
        num_problems: numProblems,
        concept_id: conceptId || null,
      }),
    }, false)
  }

  async getProgress(): Promise<ProgressData> {
    // Cache progress for 1 minute
    return this.request<ProgressData>('/api/progress', {}, true, 60 * 1000)
  }

  async getRecommendations(limit: number = 5): Promise<{ recommendations: Concept[] }> {
    // Cache recommendations for 5 minutes
    return this.request<{ recommendations: Concept[] }>(
      `/api/recommendations?limit=${limit}`,
      {},
      true
    )
  }

  async getConcept(conceptId: string): Promise<Concept> {
    // Cache concepts for 10 minutes
    return this.request<Concept>(`/api/concept/${conceptId}`, {}, true, 10 * 60 * 1000)
  }

  async listConcepts(topic?: string): Promise<{ concepts: Concept[] }> {
    const url = topic ? `/api/concepts?topic=${topic}` : '/api/concepts'
    // Cache concept lists for 5 minutes
    return this.request<{ concepts: Concept[] }>(url, {}, true)
  }

  async generateTest(
    conceptName: string,
    difficulty: string = 'intermediate',
    numQuestions: number = 5,
    conceptId?: string
  ): Promise<{ questions: any[]; concept_name: string; difficulty: string; num_questions: number }> {
    return this.request('/api/generate-test', {
      method: 'POST',
      body: JSON.stringify({
        concept_name: conceptName,
        difficulty,
        num_questions: numQuestions,
        concept_id: conceptId || null,
      }),
    }, false)
  }

  async updateMastery(conceptId: string, masteryScore: number): Promise<{ success: boolean; message: string }> {
    // Invalidate progress cache when updating mastery
    this.cache.delete(this.getCacheKey('/api/progress'))
    
    return this.request<{ success: boolean; message: string }>('/api/update-mastery', {
      method: 'POST',
      body: JSON.stringify({
        concept_id: conceptId,
        mastery_score: masteryScore,
      }),
    }, false)
  }

  // Clear all cache
  clearCache() {
    this.cache.clear()
  }

  // ============================================================================
  // TEACHER API METHODS
  // ============================================================================

  async createClassroom(name: string, description?: string, sessionToken?: string): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/teacher/classrooms`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, description })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async getTeacherClassrooms(sessionToken?: string): Promise<any[]> {
    try {
      console.log('getTeacherClassrooms: Starting...')
      console.log('Fetching classrooms from:', `${this.baseUrl}/api/teacher/classrooms`)
      
      // Use provided token or fallback to getAuthToken
      const token = sessionToken || await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available. Please log in again.')
      }
      
      // Make request with explicit token
      const url = `${this.baseUrl}/api/teacher/classrooms`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('getTeacherClassrooms: Response status:', response.status)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }))
        throw new Error(error.detail || `HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('getTeacherClassrooms: Raw result:', result)
      
      // Ensure we always return an array
      const classrooms = Array.isArray(result) ? result : []
      console.log('Fetched classrooms:', classrooms.length, classrooms)
      
      if (classrooms.length === 0) {
        console.log('No classrooms found - this might be normal if user has no classrooms yet')
      }
      
      return classrooms
    } catch (error) {
      console.error('Failed to fetch classrooms:', error)
      // Re-throw error with more context
      if (error instanceof Error) {
        const errorMsg = error.message.includes('Failed to fetch classrooms') 
          ? error.message 
          : `Failed to fetch classrooms: ${error.message}`
        throw new Error(errorMsg)
      }
      throw error
    }
  }

  async uploadDocument(
    file: File,
    classroomId: string,
    title: string,
    description?: string,
    generateActivities: boolean = true,
    sessionToken?: string
  ): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('metadata', JSON.stringify({
      classroom_id: classroomId,
      title,
      description,
      generate_activities: generateActivities,
      chunking_strategy: 'semantic'
    }))

    // For FormData, we need to use fetch directly to avoid JSON.stringify
    const url = `${this.baseUrl}/api/teacher/documents/upload`
    const token = sessionToken || await this.getAuthToken()
    const headers: Record<string, string> = {}
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async getClassroomDocuments(classroomId: string, skipCache: boolean = false): Promise<{ documents: any[] }> {
    // For polling, skip cache to always get fresh status
    const cacheKey = this.getCacheKey(`/api/teacher/documents/classroom/${classroomId}`, undefined)
    if (skipCache) {
      this.cache.delete(cacheKey)
    }
    return this.request<{ documents: any[] }>(`/api/teacher/documents/classroom/${classroomId}`, {}, !skipCache)
  }

  async getClassroomAnalytics(classroomId: string, timeRange: string = 'week', sessionToken?: string): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }
    
    const url = `${this.baseUrl}/api/teacher/analytics/${classroomId}?time_range=${timeRange}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async getStudentAnalytics(classroomId: string, studentId: string, sessionToken?: string): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }
    
    const url = `${this.baseUrl}/api/teacher/analytics/${classroomId}/student/${studentId}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async processDocumentIntelligently(documentId: string): Promise<any> {
    return this.request(`/api/teacher/documents/${documentId}/process-intelligent`, {
      method: 'POST',
    }, false)
  }

  async generateActivities(documentId: string, numQuestions: number = 10, useSmartProcessing: boolean = false): Promise<any> {
    const url = `/api/teacher/activities/generate?document_id=${documentId}&num_questions=${numQuestions}&use_smart_processing=${useSmartProcessing}`
    return this.request(url, {
      method: 'POST',
    }, false)
  }

  async createActivity(activityData: {
    document_id: string
    title: string
    description?: string
    activity_type: string
    difficulty: string
    num_questions?: number
    settings?: Record<string, any>
  }): Promise<any> {
    return this.request('/api/teacher/activities/create', {
      method: 'POST',
      body: JSON.stringify(activityData),
    }, false)
  }

  // Start async activity generation
  async startActivityGeneration(
    data: {
      document_id: string
      title: string
      difficulty: string
      num_questions: number
      classroom_id?: string
    },
    sessionToken?: string
  ): Promise<{ activity_id: string; task_id: string }> {
    const token = sessionToken || await this.getAuthToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseUrl}/api/teacher/activities/create-async`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...data,
        use_ai_generation: true
      }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `Failed to start activity generation: ${response.statusText}`)
    }
    
    return response.json()
  }

  // Get generation status
  async getActivityGenerationStatus(taskId: string): Promise<{
    status: 'processing' | 'completed' | 'failed'
    message: string
    progress: number
    activity_id?: string
    error?: string
  }> {
    return this.request(`/api/teacher/activities/generation-status/${taskId}`, {}, false)
  }

  // Cancel generation
  async cancelActivityGeneration(activityId: string): Promise<void> {
    try {
      await this.request(`/api/teacher/activities/${activityId}/cancel`, {
        method: 'POST',
      }, false)
    } catch (error) {
      console.error('Failed to cancel generation:', error)
    }
  }

  // Create simple activity (no AI)
  async createSimpleActivity(data: {
    document_id: string
    title: string
    description?: string
    activity_type: string
    difficulty: string
    num_questions: number
    classroom_id?: string
    use_ai_generation?: boolean
  }): Promise<{ activity_id: string }> {
    return this.request('/api/teacher/activities/create-simple', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false)
  }

  // Get document info
  // Removed duplicate getDocument - using the one below with proper error handling

  async getClassroomActivities(classroomId: string, sessionToken?: string): Promise<any[]> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/teacher/activities/${classroomId}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return Array.isArray(result) ? result : (result?.activities || [])
  }

  async syncClassroomActivities(classroomId: string, sessionToken?: string): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/teacher/classrooms/${classroomId}/sync-activities`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async getActivityQuestions(activityId: string, sessionToken?: string): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/teacher/activities/${activityId}/questions`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async assignActivity(activityId: string, studentIds: string[]): Promise<any> {
    return this.request('/api/teacher/activities/assign', {
      method: 'POST',
      body: JSON.stringify({
        activity_id: activityId,
        student_ids: studentIds,
      }),
    }, false)
  }

  async updateActivity(activityId: string, activityData: {
    title: string
    description?: string
    activity_type: string
    difficulty: string
    settings?: any
  }, sessionToken?: string): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('Authentication required. Please log in again.')
    }
    
    return this.request(`/api/teacher/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(activityData),
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, false)
  }

  async deleteActivity(activityId: string, force: boolean = false, sessionToken?: string): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('Authentication required. Please log in again.')
    }
    
    // Ensure force is properly converted to string 'true' or 'false' for query parameter
    const forceParam = force ? 'true' : 'false'
    console.log('deleteActivity called with force=', force, 'forceParam=', forceParam)
    
    return this.request(`/api/teacher/activities/${activityId}?force=${forceParam}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, false)
  }

  async unassignActivity(activityId: string, studentIds: string[]): Promise<any> {
    return this.request('/api/teacher/activities/unassign', {
      method: 'POST',
      body: JSON.stringify({
        activity_id: activityId,
        student_ids: studentIds,
      }),
    }, false)
  }

  async generateActivityFromPrompt(activityData: {
    classroom_id: string
    title: string
    description?: string
    prompt: string
    difficulty: string
    num_questions: number
  }): Promise<any> {
    return this.request('/api/teacher/activities/generate-from-prompt', {
      method: 'POST',
      body: JSON.stringify(activityData),
    }, false)
  }

  async createConversationalActivity(
    data: {
    title: string
    description?: string
    topic: string
    difficulty: string
    teaching_style: string
    estimated_time_minutes: number
    classroom_id?: string
    knowledge_source_mode?: 'TEACHER_DOCS' | 'GENERAL'
    document_ids?: string[]
    },
    sessionToken?: string
  ): Promise<{ 
    activity_id: string
    assigned_count?: number
    assignment_error?: string
    message?: string
  }> {
    // Use provided token or fallback to getAuthToken
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('Authentication required. Please log in again.')
    }

    // Make request with explicit token
    const url = `${this.baseUrl}/api/teacher/activities/conversational`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  async uploadActivityDocument(
    file: File,
    classroomId: string,
    title: string,
    description?: string,
    sessionToken?: string
  ): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('metadata', JSON.stringify({
      classroom_id: classroomId,
      title,
      description,
      generate_activities: false, // Don't auto-generate activities for activity-specific uploads
      chunking_strategy: 'semantic'
    }))

    const url = `${this.baseUrl}/api/teacher/documents/upload`
    const token = sessionToken || await this.getAuthToken()
    const headers: Record<string, string> = {}
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async getDocument(documentId: string, sessionToken?: string): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('Authentication required. Please log in again.')
    }

    const url = `${this.baseUrl}/api/teacher/documents/${documentId}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[API] getDocument raw response for ${documentId}:`, JSON.stringify(data, null, 2))
    
    // Handle case where response might be wrapped incorrectly
    if (data && typeof data === 'object') {
      // If response has a 'documents' array, that's wrong - should be direct document object
      // This might happen if the wrong endpoint is hit
      if (data.documents && Array.isArray(data.documents)) {
        console.error(`[API] ERROR: Got documents array instead of document object! Response:`, data)
        // Try to find the document in the array
        const doc = data.documents.find((d: any) => d.document_id === documentId)
        if (doc) {
          console.log(`[API] Found document in array:`, doc)
          return doc
        }
        throw new Error(`Document ${documentId} not found in response`)
      }
      // Return the data directly (should be the document object)
      console.log(`[API] Returning document data:`, data)
      return data
    }
    
    throw new Error(`Invalid response format for document ${documentId}`)
  }

  async getClassroomStudents(classroomId: string): Promise<any> {
    return this.request(`/api/teacher/students/${classroomId}`, {}, true)
  }

  // ============================================================================
  // STUDENT API METHODS
  // ============================================================================

  async joinClassroom(joinCode: string, sessionToken?: string): Promise<any> {
    // Use provided token or fallback to getAuthToken
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    // Make request with explicit token
    const url = `${this.baseUrl}/api/student/classrooms/join`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ join_code: joinCode }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async getStudentClassrooms(sessionToken?: string): Promise<any[]> {
    // Use provided token or fallback to getAuthToken
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    // Make request with explicit token
    const url = `${this.baseUrl}/api/student/classrooms`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return Array.isArray(result) ? result : []
  }

  async getStudentActivities(classroomId?: string, status?: string, sessionToken?: string, sync?: boolean): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const params = new URLSearchParams()
    if (classroomId) params.append('classroom_id', classroomId)
    if (status) params.append('status', status)
    if (sync !== undefined) params.append('sync', sync.toString())
    const query = params.toString()
    const url = `${this.baseUrl}/api/student/activities${query ? `?${query}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async getStudentActivity(activityId: string, sessionToken?: string): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/student/activities/${activityId}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async startStudentActivity(activityId: string, sessionToken?: string): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/student/activities/${activityId}/start`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async startActivity(activityId: string, sessionToken?: string): Promise<any> {
    return this.startStudentActivity(activityId, sessionToken)
  }

  async submitActivity(studentActivityId: string, responses: Record<string, any>, sessionToken?: string): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/student/activities/${studentActivityId}/submit`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ responses })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async submitActivityResponses(studentActivityId: string, responses: Record<string, any>, sessionToken?: string): Promise<any> {
    return this.submitActivity(studentActivityId, responses, sessionToken)
  }

  async getStudentProgress(sessionToken?: string): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/student/progress`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // ============================================================================
  // TEACHING EXAMPLES / FINE-TUNING METHODS
  // ============================================================================

  async getTeachingExamples(sessionToken?: string): Promise<any[]> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/teacher/examples`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  async createTeachingExample(
    data: {
    topic: string
    teacher_input: string
    desired_ai_response: string
    difficulty: string
    teaching_style: string
    learning_objectives: string[]
    assessment_criteria?: string[]
    },
    sessionToken?: string
  ): Promise<{ id: string }> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/teacher/examples`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  async updateTeachingExample(
    id: string,
    data: {
    topic: string
    teacher_input: string
    desired_ai_response: string
    difficulty: string
    teaching_style: string
    learning_objectives: string[]
    assessment_criteria?: string[]
    },
    sessionToken?: string
  ): Promise<void> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/teacher/examples/${id}`
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }
  }

  async deleteTeachingExample(id: string, sessionToken?: string): Promise<void> {
    if (!id) {
      throw new Error('Example ID is required for deletion')
    }
    console.log('API: Deleting teaching example with ID:', id)
    
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/teacher/examples/${id}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }
  }

  async testTeachingBehavior(data: {
    student_input: string
    context_examples?: any[]
  }): Promise<string> {
    const result = await this.request<{ response: string }>('/api/teacher/test-behavior', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false)
    return result.response
  }

  async testTeachingFlow(data: {
    topic: string
    difficulty?: string
    teaching_style?: string
    learning_objectives?: string[]
    assessment_criteria?: string[]
  }): Promise<string> {
    const result = await this.request<{ response: string } | string>('/api/teacher/test-teaching-flow', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false)
    return typeof result === 'string' ? result : result.response || ''
  }

  async getActivityIntroduction(activityId: string, sessionToken?: string): Promise<string> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/student/activities/${activityId}/introduction`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.introduction
  }

  async getPhaseResponse(activityId: string, data: {
    student_input: string
    current_phase: string
    conversation_history: Array<{ role: string; content: string }>
  }, sessionToken?: string): Promise<{ response: string; next_phase: string; current_phase: string }> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/student/activities/phase-response`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        activity_id: activityId,
        ...data
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async assessUnderstanding(activityId: string, conversationHistory: Array<{ role: string; content: string }>, sessionToken?: string): Promise<{ score: number; feedback: string }> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/student/activities/assess-understanding`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        activity_id: activityId,
        conversation_history: conversationHistory
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async getConversationalTutorResponse(
    activityId: string,
    conversationHistory: Array<{ role: string; content: string }>,
    studentResponse?: string,
    currentQuestionIndex?: number,
    teachingPhase?: string,
    questions?: Array<any>,
    sessionToken?: string
  ): Promise<any> {
    return this.request('/api/student/activities/conversational-tutor', {
      method: 'POST',
      body: JSON.stringify({
        activity_id: activityId,
        conversation_history: conversationHistory,
        student_response: studentResponse,
        current_question_index: currentQuestionIndex ?? null,
        teaching_phase: teachingPhase ?? null,
        questions: questions ?? null
      }),
    }, false)
  }

  async saveConversation(
    studentActivityId: string,
    conversationHistory: Array<{ role: string; content: string }>,
    sessionToken?: string
  ): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/student/activities/${studentActivityId}/save-conversation`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversation_history: conversationHistory
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async completeConversationalActivity(
    studentActivityId: string,
    conversationHistory: Array<{ role: string; content: string }>,
    sessionToken?: string,
    score?: number,
    feedback?: string
  ): Promise<any> {
    const token = sessionToken || await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available. Please log in again.')
    }

    const url = `${this.baseUrl}/api/student/activities/${studentActivityId}/complete-conversational`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversation_history: conversationHistory,
        score: score,
        feedback: feedback
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // ============================================================================
  // NEWSLETTER SUBSCRIPTION
  // ============================================================================

  async subscribeNewsletter(email: string, name?: string, source: string = 'landing_page'): Promise<{ success: boolean; message: string; resubscribed?: boolean; already_subscribed?: boolean }> {
    // Newsletter subscription doesn't require authentication
    const url = `${this.baseUrl}/api/newsletter/subscribe`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name: name || undefined,
        source
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }
}

// Singleton API client instance
export const api = new ApiClient()

// Cleanup on page unload to prevent memory leaks
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    api.cleanup()
  })
}

export interface QuestionRequest {
  question: string
  concept_id?: string | null
}

export interface QuestionResponse {
  answer: string
  context_used: boolean
  skill_level: string
}

export interface Concept {
  concept_id: string
  name: string
  description: string
  difficulty: string
  topic_category: string
}

export interface ProgressData {
  total_concepts_studied: number
  mastered: number
  in_progress: number
  not_started: number
  concepts: any[]
}
