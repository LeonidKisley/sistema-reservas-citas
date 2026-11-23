import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Building2, LockKeyhole, Mail, Pencil, ShieldCheck } from 'lucide-react';
import api, { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getClient, updateClient } from '../services/catalogService.js';
import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { TextField } from '../components/ui/TextField.jsx';
import { NAME_INPUT_PATTERN, isValidPersonName } from '../utils/validation.js';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };
const EMPTY_NAME = { firstName: '', lastName: '' };

export default function Profile() {
  const { user, updateSession } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [client, setClient] = useState(null);
  const [nameForm, setNameForm] = useState(EMPTY_NAME);
  const [editingName, setEditingName] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [loading, setLoading] = useState(false);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const changeName = (field) => (event) => setNameForm((current) => ({ ...current, [field]: event.target.value }));

  useEffect(() => {
    if (!user?.clientId) return undefined;
    let active = true;
    setLoadingClient(true);
    getClient(user.clientId)
      .then((response) => {
        if (!active) return;
        const data = response.data;
        setClient(data);
        setNameForm({ firstName: data?.firstName || '', lastName: data?.lastName || '' });
      })
      .catch((error) => { if (active) toast.error(errorMessage(error)); })
      .finally(() => { if (active) setLoadingClient(false); });
    return () => { active = false; };
  }, [user?.clientId]);

  const displayName = [
    client?.firstName || user?.firstName,
    client?.lastName || user?.lastName
  ].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'Auraia';

  const saveName = async (event) => {
    event.preventDefault();
    if (!client) return;
    if (!isValidPersonName(nameForm.firstName) || !isValidPersonName(nameForm.lastName)) {
      toast.error('Los nombres y apellidos solo pueden contener letras y espacios');
      return;
    }
    setSavingName(true);
    try {
      const response = await updateClient(client.id, {
        firstName: nameForm.firstName.trim(),
        lastName: nameForm.lastName.trim(),
        document: client.document,
        email: client.email || undefined,
        phone: client.phone,
        address: client.address,
        notes: client.notes
      });
      const updated = response.data;
      setClient(updated);
      setNameForm({ firstName: updated.firstName, lastName: updated.lastName });
      updateSession({ user: { ...user, firstName: updated.firstName, lastName: updated.lastName } });
      setEditingName(false);
      toast.success('Nombre actualizado correctamente');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingName(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('La confirmación de la nueva contraseña no coincide');
      return;
    }
    setLoading(true);
    try {
      await api.patch('/auth/password', form);
      toast.success('Contraseña actualizada correctamente');
      setForm(EMPTY);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Mi cuenta"
        title="Mi perfil"
        subtitle="Información de tu acceso y seguridad de la cuenta"
      />
      <div className="grid grid-2">
        <div className="card">
          <div className="profile-head">
            <Avatar name={displayName} size="lg" />
            <div className="profile-head__meta">
              {editingName ? (
                <form className="profile-name-form" onSubmit={saveName}>
                  <div className="form-row">
                    <TextField label="Nombre" value={nameForm.firstName} onChange={changeName('firstName')} pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required />
                    <TextField label="Apellidos" value={nameForm.lastName} onChange={changeName('lastName')} pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required />
                  </div>
                  <div className="row-actions">
                    <button className="button button--small" type="submit" disabled={savingName}>
                      {savingName ? 'Guardando…' : 'Guardar nombre'}
                    </button>
                    <button className="button button--ghost button--small" type="button" onClick={() => {
                      setNameForm({ firstName: client?.firstName || '', lastName: client?.lastName || '' });
                      setEditingName(false);
                    }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-name-line">
                  <strong>{loadingClient && !client ? 'Cargando…' : displayName}</strong>
                  {user?.clientId && client && (
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setEditingName(true)}
                      title="Editar nombre"
                      aria-label="Editar nombre"
                    >
                      <Pencil size={15} strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              )}
              <span>{user?.role || 'Miembro del equipo'}</span>
            </div>
          </div>
          <div className="detail-list">
            <div className="detail-row"><span>Correo electrónico</span><strong>{user?.email}</strong></div>
            <div className="detail-row"><span>Rol</span><strong>{user?.role}</strong></div>
            <div className="detail-row"><span>Salón</span><strong>{user?.tenant?.name || '—'}</strong></div>
            <div className="detail-row"><span>Dominio</span><strong>{user?.tenant?.domain || `${user?.tenant?.slug || '—'}.com`}</strong></div>
            <div className="detail-row"><span>Identificador</span><strong>{user?.tenant?.slug || '—'}</strong></div>
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <div>
              <span className="eyebrow">Seguridad</span>
              <div className="card-title" style={{ marginTop: 4 }}>Actualizar contraseña</div>
            </div>
            <ShieldCheck size={20} strokeWidth={1.6} color="#A84E60" />
          </div>
          <form onSubmit={submit}>
            <TextField label="Contraseña actual" icon={LockKeyhole} type="password" value={form.currentPassword} onChange={change('currentPassword')} required />
            <TextField label="Nueva contraseña" icon={LockKeyhole} type="password" value={form.newPassword} onChange={change('newPassword')} minLength={8} required />
            <TextField label="Confirmar nueva contraseña" icon={LockKeyhole} type="password" value={form.confirmPassword} onChange={change('confirmPassword')} minLength={8} required />
            <div className="form-actions">
              <button className="button" type="submit" disabled={loading}>
                {loading ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="card section-spaced" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Building2 size={18} strokeWidth={1.75} color="#A84E60" />
        <span className="muted" style={{ fontSize: 12 }}>
          Tu información está aislada por salón. Solo las personas autorizadas de {user?.tenant?.name || 'tu organización'} pueden verla.
        </span>
        <Mail size={16} strokeWidth={1.75} className="muted" style={{ marginLeft: 'auto' }} />
      </div>
    </>
  );
}
