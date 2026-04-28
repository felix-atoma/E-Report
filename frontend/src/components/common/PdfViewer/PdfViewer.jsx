import './PdfViewer.css';

function PdfViewer({ url, title = 'Document PDF' }) {
  if (!url) return null;

  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer__toolbar">
        <span className="pdf-viewer__title">{title}</span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          download
          className="pdf-viewer__download"
        >
          Télécharger PDF ↓
        </a>
      </div>
      <iframe
        src={url}
        className="pdf-viewer__frame"
        title={title}
      />
    </div>
  );
}

export default PdfViewer;
