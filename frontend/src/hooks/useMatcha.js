import { useState, useCallback } from 'react'

import { sendMessage, uploadFile, analyzeJob, reviewDocument, deleteDocument } from '../utils/api'

import { v4 as uuidv4 } from 'uuid'

export const useMatcha = () => {

  const [sessionId] = useState(() => uuidv4().slice(0, 8))

  const [chatHistory, setChatHistory] = useState([])

  const [agentState, setAgentState] = useState({

    messages: [],

    profile_complete: false,

    drift_detected: false,

    previous_intent_history: [],

  })

  const [isLoading, setIsLoading] = useState(false)

  const getUpdatedAgentState = useCallback((stateToUpdate) => {
    const storedTargetRole = localStorage.getItem('matcha_target_role') || ''
    const storedHours = parseInt(localStorage.getItem('matcha_hours_per_week') || '0')
    const storedName = localStorage.getItem('matcha_user_name') || ''

    const currentProfile = stateToUpdate?.user_profile || {}
    return {
      ...stateToUpdate,
      user_profile: {
        ...currentProfile,
        target_role: currentProfile.target_role || storedTargetRole || undefined,
        hours_per_week: currentProfile.hours_per_week || storedHours || undefined,
        user_name: currentProfile.user_name || storedName || undefined,
      }
    }
  }, [])

  const sendChat = useCallback(async (userInput) => {

    setIsLoading(true)

    setChatHistory(prev => [...prev, { role: 'user', content: userInput }])

    const updatedState = getUpdatedAgentState(agentState)

    try {

      const result = await sendMessage(sessionId, userInput, updatedState)

      setAgentState(result.agent_state)

      setChatHistory(prev => [...prev, { role: 'assistant', content: result.response }])

      return result

    } catch (error) {

      console.error('Error:', error)

      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Maaf, terjadi error. Coba lagi.' }])

    } finally {

      setIsLoading(false)

    }

  }, [sessionId, agentState, getUpdatedAgentState])

  const uploadDocument = useCallback(async (file, fileType) => {

    setIsLoading(true)

    try {

      const result = await uploadFile(sessionId, file, fileType)

      setAgentState(prev => ({

        ...prev,

        [fileType === 'cv' ? 'cv_text' : 'linkedin_text']: result.extracted_text,
        [fileType === 'cv' ? 'cv_uploaded' : 'linkedin_uploaded']: true,
        [fileType === 'cv' ? 'cv_filename' : 'linkedin_filename']: result.filename,
        [fileType === 'cv' ? 'cv_reviewed' : 'linkedin_reviewed']: false,
        ats_analysis: null

      }))

      return result

    } catch (error) {

      console.error('Error:', error)

      } finally {

      setIsLoading(false)

    }

  }, [sessionId])

  const reviewDocumentFull = useCallback(async (documentType) => {

    setIsLoading(true)

    const updatedState = getUpdatedAgentState(agentState)

    try {

      const result = await reviewDocument(sessionId, documentType, updatedState)

      // Merge extracted data into agentState
      setAgentState(prev => ({

        ...prev,

        ...result.agent_state,

        [documentType === 'cv' ? 'cv_reviewed' : 'linkedin_reviewed']: true,

        user_profile: {
          ...prev.user_profile,
          ...result.extracted_data,
        },

        // Merge extracted skills into existing skills
        extracted_skills: [
          ...(prev.extracted_skills || []),
          ...(result.extracted_data?.skills || [])
        ]

      }))

      setChatHistory(prev => [...prev, { role: 'assistant', content: result.response }])

      return result

    } catch (error) {

      console.error('Error reviewing document:', error)

    } finally {

      setIsLoading(false)

    }

  }, [sessionId, agentState, getUpdatedAgentState])

  const analyzeJobDescription = useCallback(async (jobDescription) => {

    setIsLoading(true)

    const updatedState = getUpdatedAgentState(agentState)

    try {

      const result = await analyzeJob(sessionId, jobDescription, updatedState)

      setAgentState(result.agent_state)

      setChatHistory(prev => [...prev, { role: 'assistant', content: result.response }])

      return result


    } catch (error) {

      console.error('Error:', error)

    } finally {

      setIsLoading(false)

    }

  }, [sessionId, agentState, getUpdatedAgentState])

  const deleteDocumentFull = useCallback(async (documentType) => {
    setIsLoading(true)
    try {
      const result = await deleteDocument(sessionId, documentType)
      setAgentState(result.agent_state)
      return result
    } catch (error) {
      console.error('Error deleting document:', error)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  return {

    sessionId,

    chatHistory,

    agentState,

    isLoading,

    sendChat,

    uploadDocument,

    reviewDocumentFull,

    analyzeJobDescription,

    deleteDocumentFull,

  }

}