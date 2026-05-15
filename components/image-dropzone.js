'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { UploadCloud, X, Loader2 } from 'lucide-react'

export default function ImageDropzone({ images, onChange, max = 8 }) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = async (files) => {
    const list = Array.from(files || [])
    if (!list.length) return
    const remaining = max - images.length
    if (remaining <= 0) {
      toast.error(`Max ${max} images.`)
      return
    }
    const toUpload = list.slice(0, remaining)
    setUploading(true)
    try {
      const fd = new FormData()
      toUpload.forEach((f) => fd.append('files', f))
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Upload failed')
      } else {
        onChange([...images, ...(data.urls || [])])
        toast.success(`Uploaded ${data.urls.length} image${data.urls.length > 1 ? 's' : ''}`)
      }
    } catch {
      toast.error('Upload network error.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-sm p-8 cursor-pointer transition text-center ${
          dragOver ? 'border-[#d4b896] bg-[#d4b896]/5' : 'border-white/10 hover:border-white/30 bg-white/[0.02]'
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-[#d4b896]" />
            <span className="text-sm">Uploading…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className="w-8 h-8 text-[#d4b896]" />
            <div className="text-sm text-white">Drop images here or click to upload</div>
            <div className="text-xs">JPG, PNG, WebP — up to 8MB each — {images.length}/{max} added</div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-4">
          {images.map((u, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-sm border border-white/10 group">
              <img src={u} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 bg-black/80 p-1 rounded-sm opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              {i === 0 && (
                <div className="absolute bottom-1 left-1 text-[10px] tracking-wider uppercase bg-[#d4b896] text-black px-1.5 py-0.5 rounded-sm">Cover</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
