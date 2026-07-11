import { useState, useRef, useEffect } from 'react'

function App() {
  const [imageQuantity, setImageQuantity] = useState(20)
  const [files, setFiles] = useState<File[]>([])
  const [description, setDescription] = useState('')
  const [exportFormat, setExportFormat] = useState('YOLO')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // HITL Checkpoint State
  const [pipelineId, setPipelineId] = useState('')
  const [showHitl, setShowHitl] = useState(false)
  const [hitlPrompt, setHitlPrompt] = useState('')
  const [transcriptionDetails, setTranscriptionDetails] = useState<any>(null)

  // Generation Progress State
  const [isGenerating, setIsGenerating] = useState(false)
  const [progressData, setProgressData] = useState<Record<str, { progress: number, total: number }>>({})
  const [labelProgress, setLabelProgress] = useState<{ progress: number, total: number } | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [driftWarnings, setDriftWarnings] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Calculate cost: roughly 1 INR per 50 images ($0.01)
  const cost = (imageQuantity / 50) * 1.50

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(selectedFiles)
    }
  }

  const handleSubmit = async () => {
    setErrorMsg('')
    setSuccessMsg('')
    setShowHitl(false)

    if (files.length < 5 || files.length > 20) {
      setErrorMsg('Please upload between 5 and 20 seed images.')
      return
    }
    if (!description.trim()) {
      setErrorMsg('Please provide a context or description.')
      return
    }

    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('description', description)
    formData.append('quantity', imageQuantity.toString())
    formData.append('export_format', exportFormat)
    
    files.forEach(file => {
      formData.append('files', file)
    })

    try {
      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (!response.ok) {
        setErrorMsg(data.detail || 'An error occurred during submission.')
      } else {
        setPipelineId(data.pipeline_id)
        setTranscriptionDetails(data.transcription)
        setHitlPrompt(data.transcription.base_prompt)
        setShowHitl(true)
      }
    } catch (err) {
      setErrorMsg('Failed to connect to the backend server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmPrompt = async () => {
    setIsSubmitting(true)
    setErrorMsg('')
    
    // Connect to WebSocket first
    const ws = new WebSocket(`ws://localhost:8000/ws/${pipelineId}`)
    wsRef.current = ws
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'progress') {
        setProgressData(prev => ({
          ...prev,
          [msg.agent]: { progress: msg.progress, total: msg.total }
        }))
      } else if (msg.type === 'label_progress') {
        setLabelProgress({ progress: msg.progress, total: msg.total })
        setStatusMessage(`Auto-Labeling images (${msg.progress}/${msg.total})...`)
      } else if (msg.type === 'info') {
        setStatusMessage(msg.message)
      } else if (msg.type === 'drift_warning') {
        setDriftWarnings(prev => [msg.message, ...prev].slice(0, 5))
      } else if (msg.type === 'packaging_complete') {
        setStatusMessage(msg.message)
        setDownloadUrl(`http://localhost:8000${msg.download_url}`)
      } else if (msg.type === 'complete') {
        setStatusMessage(msg.message)
      }
    }

    try {
      const response = await fetch('http://localhost:8000/confirm-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pipeline_id: pipelineId,
          base_prompt: hitlPrompt,
          user_description: description,
          quantity: imageQuantity,
          export_format: exportFormat
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        setErrorMsg(data.detail || 'An error occurred confirming prompt.')
        ws.close()
      } else {
        setShowHitl(false)
        setIsGenerating(true)
        
        // Initialize progress data
        const initialProgress: any = {}
        data.plan.agents.forEach((ag: any) => {
          initialProgress[ag.agent] = { progress: 0, total: ag.count }
        })
        setProgressData(initialProgress)
        setLabelProgress(null)
      }
    } catch (err) {
      setErrorMsg('Failed to connect to the backend server.')
      ws.close()
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  useEffect(() => {
    if (downloadUrl) {
      const a = document.createElement('a')
      a.href = downloadUrl
      // The download attribute helps force download instead of opening in a new tab if supported
      a.download = downloadUrl.split('/').pop() || 'dataset.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }, [downloadUrl])

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500 selection:text-white pb-20">
      {/* Navbar */}
      <nav className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="text-2xl font-bold tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600"></div>
          KALP
        </div>
        <div className="flex gap-6 text-sm font-medium text-white/60">
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
          Synthetic Data.<br />Zero Domain Gap.
        </h1>
        <p className="text-lg md:text-xl text-white/60 max-w-2xl mb-12">
          Generate hundreds of labeled, diverse, and domain-adapted images from just 5 real seed images. Perfect for industrial computer vision teams.
        </p>

        {/* Main Panel */}
        <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          {isGenerating ? (
            <div className="space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="text-left border-b border-white/10 pb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${statusMessage.includes('complete') || statusMessage.includes('successfully') ? 'bg-blue-500' : 'bg-green-500 animate-pulse'}`}></div>
                  {statusMessage.includes('Label') ? 'Auto-Labeling Dataset' : statusMessage.includes('complete') || statusMessage.includes('successfully') ? 'Pipeline Complete' : 'Generating Dataset'}
                </h2>
                <p className="text-sm text-white/50 font-mono">{statusMessage || 'Initializing agents...'}</p>
                <p className="text-xs text-white/40 mt-1">Pipeline ID: {pipelineId}</p>
              </div>

              <div className="space-y-4">
                {!labelProgress && Object.entries(progressData).map(([agent, data]) => {
                  const percent = data.total > 0 ? (data.progress / data.total) * 100 : 0
                  return (
                    <div key={agent} className="bg-black/50 border border-white/5 p-4 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium capitalize flex items-center gap-2">
                          <span className="text-blue-400">Agent</span> {agent}
                        </div>
                        <div className="text-xs font-mono text-white/60">
                          {data.progress} / {data.total}
                        </div>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}

                {labelProgress && (
                  <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-xl animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-4">
                      <div className="font-semibold text-lg flex items-center gap-2 text-blue-200">
                        🏷️ Labeling Engine (Agent 4 & 5)
                      </div>
                      <div className="text-sm font-mono text-blue-300">
                        {labelProgress.progress} / {labelProgress.total} Files
                      </div>
                    </div>
                    <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300"
                        style={{ width: `${(labelProgress.progress / labelProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {driftWarnings.length > 0 && (
                <div className="text-left mt-6 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-orange-400 mb-2">Drift Control Active</h3>
                  <div className="space-y-1">
                    {driftWarnings.map((warn, i) => (
                      <p key={i} className="text-xs text-orange-200/70 font-mono">{warn}</p>
                    ))}
                  </div>
                </div>
              )}

              {downloadUrl && (
                <div className="mt-8 pt-8 border-t border-white/10 animate-in slide-in-from-bottom-4 duration-700">
                  <a 
                    href={downloadUrl}
                    className="flex items-center justify-center gap-3 w-full py-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-bold text-lg hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Compiled Dataset
                  </a>
                  <p className="text-center text-xs text-white/40 mt-3 font-mono">
                    Format: {exportFormat} • Contains Images & Labels
                  </p>
                </div>
              )}
            </div>
          ) : showHitl ? (
            <div className="space-y-6 text-left animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-3 text-blue-400 mb-6">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <h2 className="text-2xl font-semibold text-white">Review Transcription (HITL Checkpoint)</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm bg-black/50 p-4 rounded-xl border border-white/10">
                <div><span className="text-white/50">Object:</span> {transcriptionDetails.object_name}</div>
                <div><span className="text-white/50">Material:</span> {transcriptionDetails.object_material}</div>
                <div><span className="text-white/50">Lighting:</span> {transcriptionDetails.lighting}</div>
                <div><span className="text-white/50">Classes:</span> {transcriptionDetails.detected_classes?.join(', ')}</div>
              </div>

              <div className="space-y-3">
                <label className="font-medium text-white/80">Synthesized Base Prompt (Edit if needed)</label>
                <textarea 
                  className="w-full bg-black/80 border border-blue-500/50 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-blue-100"
                  rows={4}
                  value={hitlPrompt}
                  onChange={(e) => setHitlPrompt(e.target.value)}
                ></textarea>
                <p className="text-xs text-white/40">This prompt will be sent to the Orchestrator to generate the 5 specialized variations.</p>
              </div>

              <div className="pt-6 border-t border-white/10 flex items-center justify-end gap-4">
                <button 
                  onClick={() => setShowHitl(false)}
                  className="px-6 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-all"
                >
                  Back
                </button>
                <button 
                  onClick={handleConfirmPrompt}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 hover:scale-105 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50"
                >
                  {isSubmitting ? 'Orchestrating...' : 'Confirm & Generate'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-6 text-left">Generate Pipeline</h2>
              
              <div className="space-y-6">
                {/* Upload Area */}
                <div 
                  className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-4xl mb-3 opacity-50">📸</div>
                  <p className="font-medium">
                    {files.length > 0 ? `${files.length} images selected` : 'Upload Seed Images (5-20)'}
                  </p>
                  <p className="text-sm text-white/40 mt-1">JPG or PNG, max 10MB each</p>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/jpeg, image/png"
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>

                {/* Quantity Slider */}
                <div className="text-left space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-medium text-white/80">Dataset Size</label>
                    <span className="text-sm px-3 py-1 bg-white/10 rounded-full font-mono">
                      {imageQuantity} images
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="30" 
                    step="10"
                    value={imageQuantity}
                    onChange={(e) => setImageQuantity(Number(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-white/40 font-mono">
                    <span>10</span>
                    <span>20</span>
                    <span>30</span>
                  </div>
                </div>

                {/* Prompt Input */}
                <div className="text-left space-y-3">
                  <label className="font-medium text-white/80">Context / Description</label>
                  <textarea 
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-white/20"
                    rows={3}
                    placeholder="Describe the object and environment. E.g., A cracked ceramic tile on a dusty factory floor under fluorescent lighting."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  ></textarea>
                </div>

                {/* Export Format */}
                <div className="text-left space-y-3">
                  <label className="font-medium text-white/80">Export Format</label>
                  <div className="flex gap-3">
                    {['YOLO', 'COCO', 'Pascal VOC'].map(fmt => (
                      <button 
                        key={fmt} 
                        onClick={() => setExportFormat(fmt)}
                        className={`flex-1 py-3 border rounded-xl transition-colors text-sm font-medium ${
                          exportFormat === fmt ? 'border-blue-500 bg-blue-500/20' : 'border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                {errorMsg && (
                  <div className="text-left p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
                    {errorMsg}
                  </div>
                )}

                {/* Cost & Submit */}
                <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm text-white/50">Estimated Cost</p>
                    <div className="flex items-end gap-1 font-mono">
                      <span className="text-3xl font-bold text-green-400">₹{cost.toFixed(2)}</span>
                      <span className="text-sm text-white/40 mb-1">INR</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-white/90 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isSubmitting ? 'Analyzing Seeds...' : 'Start Pipeline'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
