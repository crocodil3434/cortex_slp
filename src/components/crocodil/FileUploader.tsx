"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, X, File, FileText, FileAudio, FileImage, FileVideo, FileArchive } from "lucide-react";
import { uploadClientFile } from "@/lib/crocodil/storage";
import { useToast } from "@/components/crocodil/Toast";

interface FileUploaderProps {
  clientId: string;
  onUploadSuccess?: () => void;
}

export function FileUploader({ clientId, onUploadSuccess }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Optional visual progress simulation
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  const handleFile = async (file: File) => {
    // 50MB sınır
    if (file.size > 50 * 1024 * 1024) {
      toastError("Dosya çok büyük (Maksimum 50 MB)");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Sahte progress animasyonu
    const interval = setInterval(() => {
      setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
    }, 200);

    try {
      await uploadClientFile(clientId, file);
      clearInterval(interval);
      setUploadProgress(100);
      toastSuccess("Dosya başarıyla yüklendi");
      
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
        if (onUploadSuccess) onUploadSuccess();
      }, 500);
    } catch (err: any) {
      clearInterval(interval);
      setIsUploading(false);
      toastError(err.message || "Dosya yüklenemedi");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className={`relative border-2 border-dashed rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center min-h-[160px] ${
        isDragging ? "border-teal-500 bg-teal-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100"
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => !isUploading && fileInputRef.current?.click()}
      style={{ cursor: isUploading ? "not-allowed" : "pointer" }}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
          }
        }}
        disabled={isUploading}
      />

      {isUploading ? (
        <div className="w-full max-w-xs flex flex-col items-center">
          <UploadCloud className="w-10 h-10 text-teal-600 mb-3 animate-bounce" />
          <p className="text-sm font-semibold text-gray-700 mb-2">Yükleniyor...</p>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-teal-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-teal-600">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Tıklayın veya dosyayı buraya sürükleyin</h3>
          <p className="text-xs text-gray-400 mt-1">PDF, DOCX, Resim veya Ses Kaydı (Maks 50MB)</p>
        </>
      )}
    </div>
  );
}

export function getFileIcon(type: string) {
  if (type.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
  if (type.includes("image")) return <FileImage className="w-5 h-5 text-blue-500" />;
  if (type.includes("audio")) return <FileAudio className="w-5 h-5 text-purple-500" />;
  if (type.includes("video")) return <FileVideo className="w-5 h-5 text-pink-500" />;
  if (type.includes("zip") || type.includes("rar")) return <FileArchive className="w-5 h-5 text-yellow-600" />;
  return <File className="w-5 h-5 text-gray-500" />;
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
