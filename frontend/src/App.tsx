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

  // API Config for Deployment
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const WS_URL = API_URL.replace(/^http/, 'ws')

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
      const response = await fetch(`${API_URL}/generate`, {
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
    const ws = new WebSocket(`${WS_URL}/ws/${pipelineId}`)
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
        setDownloadUrl(`${API_URL}${msg.download_url}`)
      } else if (msg.type === 'complete') {
        setStatusMessage(msg.message)
      } else if (msg.type === 'error') {
        setStatusMessage(`Error: ${msg.message}`)
        setErrorMsg(msg.message)
      }
    }

    try {
      const response = await fetch(`${API_URL}/confirm-prompt`, {
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
      // Use window.location to trigger download reliably across origins
      window.location.href = downloadUrl
    }
  }, [downloadUrl])

  return (
    <div className="min-h-screen text-[#111] selection:bg-black/10 selection:text-black pb-20 relative overflow-hidden bg-[#fbfbf9]">
      
      {/* Absolute Background Orbs for extra depth */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-black/[0.02] blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-black/[0.02] blur-[120px] pointer-events-none -z-10"></div>

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-black/5 bg-white/40 backdrop-blur-md z-10 relative">
        <div className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-black shadow-sm">
            <div className="w-3 h-3 bg-white rounded-sm"></div>
          </div>
          <span className="font-['Outfit'] tracking-widest uppercase text-lg">KALP</span>
        </div>
        <div className="flex gap-8 text-sm font-medium text-black/50">
          <a href="#" className="hover:text-black transition-colors duration-300">Documentation</a>
          <a href="#" className="hover:text-black transition-colors duration-300">Architecture</a>
          <a href="#" className="hover:text-black transition-colors duration-300">Enterprise</a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-20 flex flex-col items-center text-center z-10 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-black/5 text-black/60 text-xs font-semibold mb-8 tracking-wider uppercase shadow-sm">
          <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
          Kalp V2 Engine Active
        </div>
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 premium-gradient-text drop-shadow-sm font-['Outfit']">
          Synthetic Data.<br />Zero Domain Gap.
        </h1>
        <p className="text-lg md:text-xl text-black/50 max-w-2xl mb-14 font-normal leading-relaxed">
          Generate hundreds of labeled, diverse, and domain-adapted datasets from just 5 real seed images. Engineered for industrial computer vision.
        </p>

        {/* Main Panel */}
        <div className="w-full max-w-2xl glass-panel rounded-3xl p-8 md:p-12 relative group transition-all duration-500">
          
          {isGenerating ? (
            <div className="space-y-8 animate-in fade-in zoom-in duration-700">
              <div className="text-left border-b border-black/5 pb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center gap-3 text-black">
                  <div className={`w-2 h-2 rounded-full ${statusMessage.includes('Error') ? 'bg-red-500' : statusMessage.includes('complete') || statusMessage.includes('successfully') ? 'bg-black' : 'bg-green-500 animate-pulse'}`}></div>
                  {statusMessage.includes('Error') ? 'Pipeline Error' : statusMessage.includes('Label') ? 'Auto-Labeling Dataset' : statusMessage.includes('complete') || statusMessage.includes('successfully') ? 'Pipeline Complete' : 'Generation Engine Running'}
                </h2>
                <p className={`text-sm font-mono ${statusMessage.includes('Error') ? 'text-red-500/80' : 'text-black/50'}`}>{statusMessage || 'Initializing agents...'}</p>
                <p className="text-xs text-black/30 mt-2 font-mono">ID: {pipelineId}</p>
              </div>

              <div className="space-y-4">
                {!labelProgress && Object.entries(progressData).map(([agent, data]) => {
                  const percent = data.total > 0 ? (data.progress / data.total) * 100 : 0
                  return (
                    <div key={agent} className="bg-white/80 border border-black/5 p-5 rounded-2xl hover:bg-white transition-colors duration-300 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-medium capitalize flex items-center gap-2 text-sm text-black/80">
                          <span className="text-black/40 text-xs uppercase tracking-wider font-bold">Agent</span> {agent}
                        </div>
                        <div className="text-xs font-mono text-black/50 bg-black/5 px-2 py-1 rounded-md">
                          {data.progress} / {data.total}
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-black transition-all duration-500 ease-out"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}

                {labelProgress && (
                  <div className="bg-white border border-black/10 p-6 rounded-2xl animate-in slide-in-from-bottom-4 duration-700 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div className="font-semibold text-lg flex items-center gap-3 text-black">
                        <svg className="w-5 h-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                        Labeling Engine
                      </div>
                      <div className="text-sm font-mono text-black/60 bg-black/5 px-3 py-1 rounded-lg border border-black/5">
                        {labelProgress.progress} / {labelProgress.total} Files
                      </div>
                    </div>
                    <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden border border-black/5">
                      <div 
                        className="h-full bg-black transition-all duration-300"
                        style={{ width: `${(labelProgress.progress / labelProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {driftWarnings.length > 0 && (
                <div className="text-left mt-6 bg-orange-50 border border-orange-200 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Drift Control Active
                  </h3>
                  <div className="space-y-2">
                    {driftWarnings.map((warn, i) => (
                      <p key={i} className="text-xs text-orange-900/60 font-mono border-l-2 border-orange-300 pl-2">{warn}</p>
                    ))}
                  </div>
                </div>
              )}

              {downloadUrl && (
                <div className="mt-8 pt-8 border-t border-black/5 animate-in slide-in-from-bottom-6 duration-1000">
                  <a 
                    href={downloadUrl}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-black text-white rounded-2xl font-semibold text-lg hover:bg-black/80 hover:scale-[1.01] shadow-lg transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Compiled Dataset
                  </a>
                  <p className="text-center text-xs text-black/40 mt-4 font-mono tracking-wide">
                    {exportFormat} Format • Auto-Labeled • Ready for Training
                  </p>
                </div>
              )}
            </div>
          ) : showHitl ? (
            <div className="space-y-8 text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-black/5 pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-black tracking-tight mb-1">Pipeline Checkpoint</h2>
                  <p className="text-sm text-black/50 font-mono flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></span>
                    Awaiting Human Validation
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm bg-white/50 p-5 rounded-2xl border border-black/5 shadow-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-black/40 uppercase tracking-wider font-semibold">Object Detected</span> 
                  <span className="text-black font-medium">{transcriptionDetails.object_name}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-black/40 uppercase tracking-wider font-semibold">Material Profile</span> 
                  <span className="text-black font-medium">{transcriptionDetails.object_material}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-black/40 uppercase tracking-wider font-semibold">Lighting Setup</span> 
                  <span className="text-black font-medium">{transcriptionDetails.lighting}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-black/40 uppercase tracking-wider font-semibold">Target Classes</span> 
                  <span className="text-black font-mono text-xs bg-black/5 px-2 py-0.5 rounded-md w-fit mt-1">{transcriptionDetails.detected_classes?.join(', ')}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="font-semibold text-black/80 text-sm tracking-wide">Synthesized Base Prompt</label>
                <textarea 
                  className="w-full bg-white border border-black/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-black font-mono leading-relaxed shadow-sm"
                  rows={4}
                  value={hitlPrompt}
                  onChange={(e) => setHitlPrompt(e.target.value)}
                ></textarea>
                <p className="text-xs text-black/40 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  This engineered prompt will be routed to the 5 specialized variations.
                </p>
              </div>

              <div className="pt-8 flex items-center justify-end gap-4">
                <button 
                  onClick={() => setShowHitl(false)}
                  className="px-6 py-3 bg-transparent border border-black/10 text-black font-medium rounded-2xl hover:bg-black/5 transition-all text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmPrompt}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-black text-white font-semibold rounded-2xl hover:bg-black/80 hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50 text-sm tracking-wide"
                >
                  {isSubmitting ? 'Orchestrating Agents...' : 'Authorize & Launch'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500 text-left">
              <div className="border-b border-black/5 pb-4">
                <h2 className="text-2xl font-bold tracking-tight text-black">Initialize Engine</h2>
                <p className="text-sm text-black/50 mt-1">Configure your synthetic data generation pipeline.</p>
              </div>
              
              <div className="space-y-8">
                {/* Upload Area */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-black/50 tracking-wider uppercase">Seed Injection</label>
                  <div 
                    className="border border-dashed border-black/10 rounded-3xl p-10 text-center bg-white/50 hover:border-black/30 hover:bg-white transition-all duration-300 cursor-pointer group shadow-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-black/10 transition-all duration-300">
                      <svg className="w-6 h-6 text-black/40 group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <p className="font-medium text-black">
                      {files.length > 0 ? <span className="text-black font-semibold">{files.length} valid images injected</span> : 'Upload Control Images'}
                    </p>
                    <p className="text-xs text-black/40 mt-2 font-mono">Requires 5-20 files • Max 10MB per file</p>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/jpeg, image/png"
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                {/* Quantity Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-black/50 tracking-wider uppercase">Dataset Scale</label>
                    <span className="text-xs px-3 py-1 bg-black/5 border border-black/10 rounded-lg font-mono text-black font-medium">
                      {imageQuantity} Yield
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="30" 
                    step="10"
                    value={imageQuantity}
                    onChange={(e) => setImageQuantity(Number(e.target.value))}
                    className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                  <div className="flex justify-between text-xs text-black/40 font-mono px-1">
                    <span>10</span>
                    <span>20</span>
                    <span>30</span>
                  </div>
                </div>

                {/* Prompt Input */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-black/50 tracking-wider uppercase">Contextual Parameters</label>
                  <textarea 
                    className="w-full bg-white border border-black/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all placeholder:text-black/30 text-black leading-relaxed shadow-sm"
                    rows={3}
                    placeholder="Describe the object and environment. E.g., A cracked ceramic tile on a dusty factory floor under fluorescent lighting."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  ></textarea>
                </div>

                {/* Export Format */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-black/50 tracking-wider uppercase">Output Target</label>
                  <div className="flex gap-3">
                    {['YOLO', 'COCO', 'Pascal VOC'].map(fmt => (
                      <button 
                        key={fmt} 
                        onClick={() => setExportFormat(fmt)}
                        className={`flex-1 py-3.5 border rounded-2xl transition-all duration-300 text-sm font-medium tracking-wide ${
                          exportFormat === fmt ? 'border-black bg-black text-white shadow-md' : 'border-black/10 bg-white/50 text-black/60 hover:bg-white hover:border-black/30 hover:text-black'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                {errorMsg && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm flex items-center gap-3">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {errorMsg}
                  </div>
                )}

                {/* Cost & Submit */}
                <div className="pt-8 border-t border-black/5 flex items-center justify-between mt-8">
                  <div>
                    <p className="text-xs text-black/40 uppercase tracking-wider font-semibold mb-1">Compute Cost</p>
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-2xl font-bold text-black tracking-tight">₹{cost.toFixed(2)}</span>
                      <span className="text-xs text-black/40 mb-1">INR</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-8 py-3.5 bg-black text-white font-semibold tracking-wide rounded-2xl hover:bg-black/80 hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center gap-2 text-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Analyzing Seeds...
                      </>
                    ) : 'Initialize Pipeline'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
