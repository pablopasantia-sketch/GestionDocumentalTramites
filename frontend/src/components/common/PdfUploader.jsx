import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Trash2, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function PdfUploader({
  files = [],
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 25,
  disabled = false
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const formatBytes = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const validateAndAddFiles = (incomingFiles) => {
    setErrorMsg(null);
    const validPdfs = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (files.length + incomingFiles.length > maxFiles) {
      setErrorMsg(`Solo se permite adjuntar hasta un máximo de ${maxFiles} documentos PDF.`);
      return;
    }

    for (const file of incomingFiles) {
      // Validar tipo y extensión
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setErrorMsg(`El archivo "${file.name}" no es un documento PDF válido. Solo se admiten archivos .pdf.`);
        continue;
      }

      if (file.size > maxSizeBytes) {
        setErrorMsg(`El archivo "${file.name}" excede el peso máximo permitido de ${maxSizeMB} MB.`);
        continue;
      }

      // Evitar duplicados por nombre y peso
      const alreadyExists = files.some(f => f.name === file.name && f.size === file.size);
      if (!alreadyExists) {
        validPdfs.push(file);
      }
    }

    if (validPdfs.length > 0) {
      onFilesChange([...files, ...validPdfs]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(Array.from(e.target.files));
      e.target.value = ''; // Reset para permitir volver a elegir el mismo si se quitó
    }
  };

  const removeFile = (indexToRemove) => {
    onFilesChange(files.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div>
      {/* Zona Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed #800000' : '2px dashed #CBD5E1',
          background: isDragging ? '#FFF8F8' : disabled ? '#F3F4F6' : '#FAFAFA',
          borderRadius: '8px',
          padding: '1.5rem 1rem',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isDragging ? '0 0 10px rgba(128, 0, 0, 0.15)' : 'none'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          disabled={disabled}
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F1F5F9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#800000', marginBottom: '8px' }}>
          <UploadCloud size={24} />
        </div>

        <div style={{ fontWeight: 700, color: '#1B365D', fontSize: '0.92rem', marginBottom: '4px' }}>
          Haga clic o arrastre archivos PDF aquí
        </div>

        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
          Soporta hasta {maxFiles} documentos digitales (Máx. {maxSizeMB} MB por PDF)
        </div>
      </div>

      {/* Alerta de Error si la hubiere */}
      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '8px 12px', borderRadius: '6px', marginTop: '10px', fontSize: '0.8rem' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Lista de Archivos Seleccionados */}
      {files.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1B365D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Documentos PDF seleccionados ({files.length}):
          </div>

          {files.map((f, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', flexShrink: 0 }}>
                  <FileText size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                    {f.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    {formatBytes(f.size)} • Documento PDF
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                style={{ padding: '4px 8px', border: 'none', color: '#DC2626' }}
                title="Quitar archivo"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
