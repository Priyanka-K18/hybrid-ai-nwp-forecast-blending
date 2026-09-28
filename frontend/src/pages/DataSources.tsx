import React, { useState, useEffect } from 'react';
import {
  Database,
  Upload,
  CheckCircle2,
  AlertCircle,
  Radio,
  FileText,
  Layers,
  ArrowUpRight,
  HardDrive,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { fetchDataSources, uploadDataset } from '../services/api';

export const DataSources: React.FC = () => {
  const [sources, setSources] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<any>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    fetchDataSources()
      .then((data) => setSources(data))
      .catch((err) => console.error(err));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await uploadDataset(file);
      setUploadStatus(res);
    } catch (err: any) {
      setUploadStatus({ status: 'FAILED', message: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, color: '#f8fafc', paddingBottom: 40 }}>
      {/* ─── Command Header ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(10, 16, 31, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: 20,
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(168,85,247,0.2) 100%)',
            border: '1px solid rgba(56,189,248,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Database className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 style={{
              fontSize: 20, fontWeight: 800, margin: 0,
              background: 'linear-gradient(90deg, #ffffff 0%, #38bdf8 60%, #a855f7 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              DATA ADAPTER CONNECTORS & INGESTION
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{
                fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                padding: '2px 7px', borderRadius: 4, background: 'rgba(251,191,36,0.12)',
                color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)',
              }}>
                DEMO DATA
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                Decoupled Adapters for GRIB2, NetCDF4, AWS Mesonet & Real-Time Satellite Telemetry
              </span>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 10, padding: '6px 12px', fontSize: 11, color: '#34d399', fontWeight: 700,
        }}>
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>4 Telemetry Pipes Active</span>
        </div>
      </div>

      {/* ─── 4 Ingest Connectors Cards ─────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16,
      }}>
        {sources.map((src) => (
          <div
            key={src.source_id}
            style={{
              background: 'rgba(10, 16, 31, 0.75)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{src.name}</span>
                <span style={{
                  padding: '2px 7px', borderRadius: 6, fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)',
                }}>
                  {src.status}
                </span>
              </div>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#64748b', display: 'block', marginTop: 2 }}>
                ID: {src.source_id}
              </span>
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
              borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Format:</span>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>{src.format}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Latency:</span>
                <span style={{ color: '#34d399' }}>{src.latency_ms} ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Ingested:</span>
                <span style={{ color: '#ffffff' }}>{src.record_count.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Sync:</span>
                <span style={{ color: '#94a3b8' }}>{src.frequency}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Drag-and-Drop Dataset Ingestion Sandbox ──────────────────────────── */}
      <div style={{
        background: 'rgba(10, 16, 31, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: 20,
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload className="w-5 h-5 text-cyan-400" />
            Custom Ground Observation Dataset Ingest
          </h3>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0 0' }}>
            Upload observation CSV or NetCDF (.nc) files from regional AWS networks for retrospective skill verification.
          </p>
        </div>

        <div style={{
          border: '2px dashed rgba(56, 189, 248, 0.3)',
          borderRadius: 16,
          padding: 30,
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}>
          <FileText className="w-10 h-10 text-cyan-400" />
          <div style={{ fontSize: 12, color: '#cbd5e1' }}>
            Drag and drop your observation files here, or{' '}
            <label style={{ color: '#38bdf8', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
              browse filesystem
              <input type="file" onChange={handleFileChange} style={{ display: 'none' }} accept=".csv,.json,.nc,.grib2" />
            </label>
          </div>
          {file && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(56,189,248,0.1)', border: '1px solid #38bdf8',
              borderRadius: 8, padding: '6px 14px', fontSize: 11, color: '#38bdf8',
            }}>
              <span>Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={handleUploadSubmit}
            disabled={!file || isUploading}
            style={{
              padding: '9px 20px', borderRadius: 10,
              background: !file || isUploading ? '#334155' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1px solid #38bdf8', color: '#fff', fontSize: 11, fontWeight: 700,
              cursor: !file || isUploading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Parsing & Ingesting...' : 'Upload & Re-Verify'}
          </button>
        </div>

        {uploadStatus && (
          <div style={{
            padding: 12, borderRadius: 10,
            background: uploadStatus.status === 'SUCCESS' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${uploadStatus.status === 'SUCCESS' ? '#10b981' : '#f87171'}`,
            fontSize: 11, color: uploadStatus.status === 'SUCCESS' ? '#34d399' : '#fca5a5',
          }}>
            {uploadStatus.message || (uploadStatus.status === 'SUCCESS' ? 'Dataset ingested and verified successfully.' : 'Upload failed.')}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSources;
