import React, { useRef } from "react";

const MultiFileUpload = ({ files, setFiles, onFilesChange }) => {
  const fileInputRef = useRef();

  const handleFiles = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const updatedFiles = [...files, ...selectedFiles];
    setFiles(updatedFiles);
    if (onFilesChange) onFilesChange(updatedFiles);
  };

  const removeFile = (index) => {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
    if (onFilesChange) onFilesChange(updatedFiles);
  };

  return (
    <div
      className="multi-file-upload"
      style={{
        padding: "20px",
        width: "100%",
        boxSizing: "border-box", // ensures padding is included in width
      }}
    >
      {/* Centered dropzone with max width */}
      <div
        onClick={() => fileInputRef.current.click()}
        style={{
          padding: "40px",
          border: "2px dashed #253238",
          borderRadius: "10px",
          backgroundColor: "#f4f4f4",
          color: "#253238",
          textAlign: "center",
          cursor: "pointer",
          transition: "background-color 0.2s",
          maxWidth: "700px", // max width for large screens
          margin: "0 auto",   // center horizontally
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const droppedFiles = Array.from(e.dataTransfer.files);
          const updatedFiles = [...files, ...droppedFiles];
          setFiles(updatedFiles);
          if (onFilesChange) onFilesChange(updatedFiles);
        }}
      >
        <p style={{ margin: 0, fontSize: "16px" }}>
          Click or drag files here to upload <br />
          <span style={{ fontSize: "12px", color: "#555" }}>
            (Supports multiple files: images, PDFs, docs, etc.)
          </span>
        </p>
      </div>

      <input
        type="file"
        multiple
        accept="*/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFiles}
      />

      {files.length > 0 && (
        <div
          className="file-list"
          style={{
            marginTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            maxWidth: "700px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {files.map((file, index) => (
            <div
              key={index}
              className="file-item"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                backgroundColor: "#fff",
                fontSize: "14px",
                color: "#253238",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                style={{
                  background: "#253238",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  lineHeight: "1",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiFileUpload;
