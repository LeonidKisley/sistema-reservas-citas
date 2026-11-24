import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { ArrowDown, ArrowUp, Trash2, UploadCloud } from 'lucide-react';
import Modal from '../Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { errorMessage, successMessage } from '../../services/api.js';
import { deleteImage, reorderImages, uploadImages } from '../../services/catalogService.js';
import { SERVICE_IMAGE_MAX_FILES, validateImageFiles } from '../../utils/serviceImageUpload.js';

const ACCEPT = '.jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif';

export default function ServiceGalleryModal({ service, onClose, onUpdated }) {
  const { user } = useAuth();
  const [images, setImages] = useState(service.images || []);
  const [pending, setPending] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => () => {
    pending.forEach((item) => URL.revokeObjectURL(item.url));
  }, [pending]);

  if (user?.role !== 'Administrador') return null;

  const addFiles = (fileList) => {
    const { accepted, errors } = validateImageFiles(fileList, images.length + pending.length);
    errors.slice(0, 3).forEach((error) => toast.error(error));
    if (errors.length > 3) toast.error(`${errors.length - 3} errores más`);
    if (!accepted.length) return;
    setPending((current) => [
      ...current,
      ...accepted.map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file)
      }))
    ]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const upload = async () => {
    if (!pending.length) return;
    setBusy(true);
    try {
      const response = await uploadImages(service.id, pending.map((item) => item.file));
      setImages(response.data?.images || images);
      setPending([]);
      toast.success(successMessage(response, 'Fotos subidas correctamente'));
      await onUpdated?.();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const removeImage = async (image) => {
    const result = await Swal.fire({
      title: '¿Quitar foto?',
      text: `${image.name} — se eliminará también del almacenamiento.`,
      icon: 'warning',
      iconColor: '#C26476',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#C26476',
      cancelButtonColor: '#A99A9F'
    });
    if (!result.isConfirmed) return;
    setBusy(true);
    try {
      const response = await deleteImage(service.id, image.name);
      setImages(response.data?.images || images.filter((item) => item.name !== image.name));
      toast.success(successMessage(response, 'Foto quitada correctamente'));
      await onUpdated?.();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const moveImage = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const names = images.map((image) => image.name);
    [names[index], names[target]] = [names[target], names[index]];
    setBusy(true);
    try {
      const response = await reorderImages(service.id, names);
      setImages(response.data?.images || images);
      await onUpdated?.();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const removePending = (id) => {
    setPending((current) => current.filter((item) => {
      if (item.id === id) URL.revokeObjectURL(item.url);
      return item.id !== id;
    }));
  };

  return (
    <Modal
      title={`Galería de ${service.name}`}
      description={`Hasta ${SERVICE_IMAGE_MAX_FILES} fotos · jpg, jpeg, png, webp o avif · 2 MB por foto`}
      onClose={onClose}
      wide
    >
      <div
        className={`gallery-dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud size={24} strokeWidth={1.5} />
        <p>Arrastra tus fotos aquí o selecciónalas desde tu equipo</p>
        <label className="button button--small">
          Seleccionar fotos
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            onChange={(event) => addFiles(event.target.files)}
            hidden
          />
        </label>
        <small>{images.length + pending.length} de {SERVICE_IMAGE_MAX_FILES} fotos</small>
      </div>

      {images.length > 0 && (
        <div className="gallery-grid">
          {images.map((image, index) => (
            <div className="gallery-item" key={image.name}>
              <img src={image.url} alt={`${service.name} · foto ${index + 1}`} />
              <div className="gallery-item__actions">
                <button type="button" onClick={() => moveImage(index, -1)} disabled={busy || index === 0} aria-label="Mover foto antes"><ArrowUp size={13} /></button>
                <button type="button" onClick={() => moveImage(index, 1)} disabled={busy || index === images.length - 1} aria-label="Mover foto después"><ArrowDown size={13} /></button>
                <button type="button" onClick={() => removeImage(image)} disabled={busy} aria-label="Quitar foto"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="gallery-preview">
          <strong>Vista previa antes de subir</strong>
          <div className="gallery-grid">
            {pending.map((item) => (
              <div className="gallery-item gallery-item--pending" key={item.id}>
                <img src={item.url} alt={`Vista previa de ${item.file.name}`} />
                <button type="button" onClick={() => removePending(item.id)} aria-label={`Descartar ${item.file.name}`}><Trash2 size={13} /></button>
                <small>{item.file.name}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="button button--ghost" onClick={onClose}>Cerrar</button>
        <button type="button" className="button" disabled={busy || !pending.length} onClick={upload}>
          {busy ? 'Guardando…' : `Subir ${pending.length ? `${pending.length} ` : ''}fotos`}
        </button>
      </div>
    </Modal>
  );
}
