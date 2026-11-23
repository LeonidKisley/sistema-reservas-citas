import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../services/api.js';
import BrandLogo from '../components/ui/BrandLogo.jsx';
import { TextField } from '../components/ui/TextField.jsx';
import {
  NAME_INPUT_PATTERN,
  PERU_PHONE_PREFIX,
  composeEmail,
  composePeruPhone,
  isValidDni,
  isValidEmailLocal,
  isValidPeruPhoneLocal,
  isValidPersonName,
  tenantDomainFrom
} from '../utils/validation.js';

const SLUGIFY = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 42);

const SALON_EMPTY = {
  name: '', slug: '', contactEmail: '', phone: '', address: '',
  adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: ''
};
const CLIENT_EMPTY = {
  tenant: '', firstName: '', lastName: '', document: '', email: '', phone: '', password: ''
};

export default function RegisterClient() {
  const { registerClient, registerSalon } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('salon');
  const [salon, setSalon] = useState(SALON_EMPTY);
  const [client, setClient] = useState(CLIENT_EMPTY);
  const [loading, setLoading] = useState(false);

  const changeSalon = (field) => (event) => {
    const value = event.target.value;
    setSalon((current) => {
      const next = { ...current, [field]: value };
      if (field === 'name') next.slug = SLUGIFY(value);
      return next;
    });
  };

  const changeClient = (field) => (event) => setClient((current) => ({ ...current, [field]: event.target.value }));
  const changeDigits = (setter, field, max) => (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, max);
    setter((current) => ({ ...current, [field]: value }));
  };

  const regenerateSlug = () => {
    const suffix = Math.floor(10 + Math.random() * 90);
    setSalon((current) => ({ ...current, slug: `${SLUGIFY(current.name) || 'auraia'}-${suffix}` }));
  };

  const salonDomain = tenantDomainFrom(salon.slug);
  const clientDomain = tenantDomainFrom(client.tenant);

  const validateForm = () => {
    if (mode === 'salon') {
      if (!isValidPersonName(salon.adminFirstName) || !isValidPersonName(salon.adminLastName)) {
        return 'Los nombres y apellidos solo pueden contener letras y espacios';
      }
      if (!salonDomain) return 'Ingresa un nombre de salón válido para generar el dominio';
      if (salon.contactEmail && !isValidEmailLocal(salon.contactEmail)) return 'El correo de contacto no es válido';
      if (!isValidEmailLocal(salon.adminEmail)) return 'El correo de acceso no es válido';
      if (salon.phone && !isValidPeruPhoneLocal(salon.phone)) return 'El teléfono debe tener 9 dígitos después de +51';
      return null;
    }
    if (!isValidPersonName(client.firstName) || !isValidPersonName(client.lastName)) {
      return 'Los nombres y apellidos solo pueden contener letras y espacios';
    }
    if (!clientDomain) return 'Ingresa un salón válido para usar su dominio de correo';
    if (!isValidDni(client.document)) return 'El DNI debe tener exactamente 8 dígitos';
    if (!isValidEmailLocal(client.email)) return 'El correo electrónico no es válido';
    if (client.phone && !isValidPeruPhoneLocal(client.phone)) return 'El teléfono debe tener 9 dígitos después de +51';
    return null;
  };

  const submit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setLoading(true);
    try {
      if (mode === 'salon') {
        const payload = {
          ...salon,
          contactEmail: composeEmail(salon.contactEmail, salonDomain),
          adminEmail: composeEmail(salon.adminEmail, salonDomain),
          phone: composePeruPhone(salon.phone)
        };
        const result = await registerSalon(payload);
        const tenant = result?.tenant;
        toast.success(`¡${tenant?.name || 'Tu salón'} está listo! Tu dominio es ${tenant?.domain || `${tenant?.slug || salon.slug}.com`}.`);
        navigate('/login', { state: { tenant: tenant?.slug || salon.slug } });
        return;
      }
      const payload = {
        ...client,
        email: composeEmail(client.email, clientDomain),
        phone: composePeruPhone(client.phone)
      };
      await registerClient(payload);
      toast.success('Registro exitoso. Ahora puedes iniciar sesión.');
      navigate('/login', { state: { tenant: client.tenant } });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      <section className="auth-pane auth-pane--form">
        <form className="auth-form" onSubmit={submit}>
          <BrandLogo size="lg" />
          <div className="auth-intro">
            <span className="eyebrow">Comienza con Auraia</span>
            <h1>Crea tu espacio <em>de belleza.</em></h1>
            <p>Configura tu salón en minutos. Nosotros generamos tu identificador y preparamos todo para tu primer día.</p>
          </div>

          <div className="mode-tabs" role="tablist" aria-label="Tipo de registro">
            <button
              type="button"
              className="mode-tab"
              role="tab"
              aria-selected={mode === 'salon'}
              onClick={() => setMode('salon')}
            >
              Soy un salón
            </button>
            <button
              type="button"
              className="mode-tab"
              role="tab"
              aria-selected={mode === 'client'}
              onClick={() => setMode('client')}
            >
              Soy cliente
            </button>
          </div>

          {mode === 'salon' ? (
            <>
              <TextField
                label="Nombre del salón"
                icon={Building2}
                value={salon.name}
                onChange={changeSalon('name')}
                placeholder="Ej. Casa Lucía Beauty"
                required
              />
              <div className="field">
                <span className="field__label">Dominio de tu salón</span>
                <div className="slug-preview">
                  <span className="slug-preview__label">
                    <small>Se genera desde el nombre del negocio</small>
                    <strong>{salon.slug || 'tu-salon'}.com</strong>
                  </span>
                  <button type="button" className="icon-button" onClick={regenerateSlug} title="Generar otro dominio" aria-label="Generar otro dominio">
                    <RefreshCw size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
              <div className="form-row">
                <TextField
                  label="Correo de contacto"
                  value={salon.contactEmail}
                  onChange={changeSalon('contactEmail')}
                  placeholder="hola"
                  suffix={`@${salonDomain || 'tusalon.com'}`}
                  inputMode="email"
                />
                <TextField
                  label="Teléfono"
                  icon={Phone}
                  prefix={PERU_PHONE_PREFIX}
                  value={salon.phone}
                  onChange={changeDigits(setSalon, 'phone', 9)}
                  placeholder="999 999 999"
                  inputMode="numeric"
                  maxLength={9}
                />
              </div>
              <TextField label="Dirección" icon={MapPin} value={salon.address} onChange={changeSalon('address')} placeholder="Calle, número y ciudad" />

              <div className="form-row">
                <TextField label="Nombre de la administradora" icon={UserRound} value={salon.adminFirstName} onChange={changeSalon('adminFirstName')} placeholder="Nombre" pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required />
                <TextField label="Apellidos" value={salon.adminLastName} onChange={changeSalon('adminLastName')} placeholder="Apellidos" pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required />
              </div>
              <TextField
                label="Correo de acceso"
                icon={Mail}
                value={salon.adminEmail}
                onChange={changeSalon('adminEmail')}
                placeholder="admin"
                suffix={`@${salonDomain || 'tusalon.com'}`}
                inputMode="email"
                required
              />
              <TextField
                label="Contraseña"
                type="password"
                value={salon.adminPassword}
                onChange={changeSalon('adminPassword')}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                hint="Usa mayúsculas, minúsculas y números para mayor seguridad."
                required
              />
            </>
          ) : (
            <>
              <TextField label="Dominio o identificador del salón" icon={Building2} value={client.tenant} onChange={changeClient('tenant')} placeholder="p. ej. auraria o auraria.com" required />
              <div className="form-row">
                <TextField label="Nombres" icon={UserRound} value={client.firstName} onChange={changeClient('firstName')} placeholder="Nombre" pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required />
                <TextField label="Apellidos" value={client.lastName} onChange={changeClient('lastName')} placeholder="Apellidos" pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required />
              </div>
              <TextField
                label="DNI"
                value={client.document}
                onChange={changeDigits(setClient, 'document', 8)}
                placeholder="8 dígitos"
                inputMode="numeric"
                pattern="[0-9]{8}"
                maxLength={8}
                title="El DNI debe tener 8 dígitos"
                required
              />
              <TextField
                label="Correo electrónico"
                icon={Mail}
                value={client.email}
                onChange={changeClient('email')}
                placeholder="nombre"
                suffix={`@${clientDomain || 'tusalon.com'}`}
                inputMode="email"
                required
              />
              <TextField
                label="Teléfono (opcional)"
                icon={Phone}
                prefix={PERU_PHONE_PREFIX}
                value={client.phone}
                onChange={changeDigits(setClient, 'phone', 9)}
                placeholder="999 999 999"
                inputMode="numeric"
                maxLength={9}
              />
              <TextField
                label="Contraseña"
                type="password"
                value={client.password}
                onChange={changeClient('password')}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                hint="Mínimo 8 caracteres, con mayúscula, minúscula y número."
                required
              />
            </>
          )}

          <button className="button button--block auth-submit" type="submit" disabled={loading}>
            {loading ? 'Creando tu espacio…' : mode === 'salon' ? 'Crear mi salón' : 'Crear mi cuenta'}
            {!loading && <ArrowRight size={16} strokeWidth={1.75} />}
          </button>

          <div className="auth-alt">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></div>
          <div className="trust-row">
            <span><CheckCircle2 size={14} /> Alta inmediata</span>
            <span><ShieldCheck size={14} /> Datos protegidos</span>
            <span><Users size={14} /> Listo para tu equipo</span>
          </div>
        </form>
      </section>

      <section className="auth-pane auth-pane--showcase" aria-label="Cómo funciona Auraia">
        <span className="showcase-orb" />
        <span className="showcase-orb showcase-orb--top" />
        <div className="showcase-inner">
          <span className="showcase-kicker">Tu estudio, digitalizado</span>
          <h2>Todo listo para recibir a tus clientas.</h2>
          <p>Desde el primer día tendrás una agenda elegante, un catálogo de servicios y un equipo trabajando en sintonía.</p>

          <div className="preview-card">
            <div className="preview-card__top">
              <div>
                <strong>Tu identidad Auraia</strong>
                <span>Un espacio propio para tu marca</span>
              </div>
              <Sparkles size={20} color="#A84E60" strokeWidth={1.6} />
            </div>
            <div className="benefit-list" style={{ marginTop: 16 }}>
              <div className="benefit">
                <span className="benefit__icon"><ClipboardCheck size={17} strokeWidth={1.75} /></span>
                <span><strong>1. Cuéntanos de tu salón</strong><small>Nombre, contacto y dirección.</small></span>
              </div>
              <div className="benefit">
                <span className="benefit__icon"><Users size={17} strokeWidth={1.75} /></span>
                <span><strong>2. Invita a tu equipo</strong><small>Profesionales, servicios y horarios.</small></span>
              </div>
              <div className="benefit">
                <span className="benefit__icon"><Sparkles size={17} strokeWidth={1.75} /></span>
                <span><strong>3. Empieza a reservar</strong><small>Agenda y citas en un mismo lugar.</small></span>
              </div>
            </div>
          </div>
          <div className="trust-row">
            <span><ShieldCheck size={14} /> Información aislada por salón</span>
          </div>
        </div>
      </section>
    </div>
  );
}
