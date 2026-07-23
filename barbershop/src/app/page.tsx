import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { ROLE_HOME } from "@/modules/auth/role-home";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui";
import styles from "./home.module.css";

// Ícone ilustrativo por nome de serviço — puramente decorativo, não faz
// parte do schema. Serviço sem correspondência cai no ícone genérico.
const SERVICE_ICON: Record<string, string> = {
  "Corte de Cabelo": "✂️",
  "Barba": "🪒",
  "Corte + Barba": "💈",
  "Sobrancelha": "👁️",
  "Pézinho / Acabamento": "🧵",
  "Hidratação Capilar": "💧",
  "Coloração / Pigmentação": "🎨",
  "Relaxamento": "🌊",
  "Desenho na Barba": "✏️",
  "Platinado": "⚡",
};
const DEFAULT_SERVICE_ICON = "💈";

// Texto de especialidade por e-mail do barbeiro — só copy de marketing,
// não existe campo "especialidade" no schema. Barbeiro sem entrada aqui
// cai no texto genérico (ver BARBER_SPECIALTY_FALLBACK).
const BARBER_SPECIALTY: Record<string, string> = {
  "joao@barbearia.com": "Cortes clássicos & navalha",
  "pedro@barbearia.com": "Coloração & platinado",
};
const BARBER_SPECIALTY_FALLBACK = "Atendimento personalizado, do corte ao acabamento";

// TODO: substituir pelos dados reais da barbearia antes de publicar.
const CONTACT_INFO = {
  addressLine1: "[Endereço da barbearia — a definir]",
  addressLine2: "[Bairro, Cidade — UF]",
  phone: "[Telefone / WhatsApp]",
  instagramUrl: "#",
  whatsappUrl: "#",
};

export default async function HomePage() {
  const user = await getCurrentUser();
  const authenticatedHref = user ? ROLE_HOME[user.role] ?? "/agendar" : "/";

  const [services, barbers] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "BARBER", active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <SiteHeader isAuthenticated={Boolean(user)} authenticatedHref={authenticatedHref} />

      {/* ===================== HERO ===================== */}
      <div className={styles.hero}>
        <Container width="sm" className={styles.heroInner}>
          <p className={styles.eyebrow}>Tradição &amp; navalha</p>
          <h1 className={styles.title}>Sua barbearia de confiança</h1>
          <p className={styles.subtitle}>
            Agende seu horário online com o barbeiro da sua preferência, sem filas e sem ligações.
          </p>

          {user ? (
            <Link href={authenticatedHref} className={styles.ctaPrimary}>
              Ir para minha área
            </Link>
          ) : (
            <div className={styles.ctaRow}>
              <Link href="/login" className={styles.ctaSecondary}>
                Entrar
              </Link>
              <Link href="/cadastro" className={styles.ctaPrimary}>
                Criar conta
              </Link>
            </div>
          )}

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <div className={styles.statValue}>{services.length}</div>
              <div className={styles.statLabel}>Tipos de serviço</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>{barbers.length}</div>
              <div className={styles.statLabel}>Barbeiros especialistas</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>Seg–Sáb</div>
              <div className={styles.statLabel}>09h às 18h</div>
            </div>
          </div>
        </Container>
      </div>

      <div className={styles.razorDivider}>
        <div className={styles.line} />
        <div className={styles.dot} />
        <div className={styles.line} />
      </div>

      {/* ===================== SERVIÇOS ===================== */}
      {services.length > 0 && (
        <section id="servicos" className={styles.section}>
          <Container width="lg" className={styles.sectionInner}>
            <div className={styles.sectionHead}>
              <p className={styles.sectionEyebrow}>Cardápio</p>
              <h2 className={styles.sectionTitle}>Nossos serviços</h2>
              <p className={styles.sectionSubtitle}>
                Veja o que oferecemos e o preço de cada serviço antes mesmo de agendar.
              </p>
            </div>

            <div className={styles.servicesGrid}>
              {services.map((service) => (
                <div key={service.id} className={styles.serviceCard}>
                  <span className={styles.serviceIcon}>{SERVICE_ICON[service.name] ?? DEFAULT_SERVICE_ICON}</span>
                  <p className={styles.serviceName}>{service.name}</p>
                  <p className={styles.serviceMeta}>{service.durationMin} min</p>
                  {service.description && <p className={styles.serviceDesc}>{service.description}</p>}
                  <p className={styles.servicePrice}>R$ {service.price.toString()}</p>
                </div>
              ))}
            </div>

            <p className={styles.servicesFootnote}>
              Crie sua conta pra escolher o barbeiro e ver os horários livres —{" "}
              <Link href="/cadastro">criar conta →</Link>
            </p>
          </Container>
        </section>
      )}

      <div className={styles.razorDivider}>
        <div className={styles.line} />
        <div className={styles.dot} />
        <div className={styles.line} />
      </div>

      {/* ===================== BARBEIROS ===================== */}
      {barbers.length > 0 && (
        <section id="barbeiros" className={styles.section}>
          <Container width="lg" className={styles.sectionInner}>
            <div className={styles.sectionHead}>
              <p className={styles.sectionEyebrow}>Equipe</p>
              <h2 className={styles.sectionTitle}>Nossos barbeiros</h2>
              <p className={styles.sectionSubtitle}>Profissionais experientes, cada um com uma especialidade.</p>
            </div>

            <div className={styles.barbersGrid}>
              {barbers.map((barber) => (
                <div key={barber.id} className={styles.barberCard}>
                  <div className={styles.barberAvatar}>{barber.name.charAt(0).toUpperCase()}</div>
                  <div className={styles.barberInfo}>
                    <p className={styles.barberName}>{barber.name}</p>
                    <p className={styles.barberSpecialty}>
                      {BARBER_SPECIALTY[barber.email] ?? BARBER_SPECIALTY_FALLBACK}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      <div className={styles.razorDivider}>
        <div className={styles.line} />
        <div className={styles.dot} />
        <div className={styles.line} />
      </div>

      {/* ===================== HORÁRIO & LOCALIZAÇÃO ===================== */}
      <section id="horario" className={styles.section}>
        <Container width="lg" className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>Informações</p>
            <h2 className={styles.sectionTitle}>Horário &amp; localização</h2>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <h3 className={styles.infoCardTitle}>🕒 Horário de funcionamento</h3>
              <ul className={styles.hoursList}>
                <li className={styles.hoursRow}>
                  <span>Segunda a sexta</span>
                  <strong>09h — 18h</strong>
                </li>
                <li className={styles.hoursRow}>
                  <span>Sábado</span>
                  <strong>09h — 18h</strong>
                </li>
                <li className={styles.hoursRow}>
                  <span>Domingo</span>
                  <span className={styles.hoursClosed}>Fechado</span>
                </li>
              </ul>
            </div>

            <div className={styles.infoCard}>
              <h3 className={styles.infoCardTitle}>📍 Endereço</h3>
              <p className={styles.addressLine}>
                {CONTACT_INFO.addressLine1}
                <br />
                {CONTACT_INFO.addressLine2}
                <br />
                {CONTACT_INFO.phone}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ===================== CTA FINAL ===================== */}
      {!user && (
        <section className={styles.section}>
          <Container width="lg">
            <div className={styles.closingCta}>
              <div className={styles.closingCtaText}>
                <h2>Pronto pra marcar seu horário?</h2>
                <p>Leva menos de um minuto — sem ligação, sem fila de espera.</p>
              </div>
              <Link href="/cadastro" className={styles.ctaPrimary}>
                Criar conta e agendar
              </Link>
            </div>
          </Container>
        </section>
      )}

      {/* ===================== FOOTER ===================== */}
      <footer className={styles.footer}>
        <Container width="lg" className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <p className={styles.footerBrandName}>
              Barbearia<span className={styles.brandDot}>.</span>
            </p>
            <p className={styles.footerTagline}>
              Tradição e navalha desde sempre. Cortes clássicos, barba na régua e atendimento sem fila.
            </p>
          </div>
          <div className={styles.footerCols}>
            <div>
              <p className={styles.footerColTitle}>Navegação</p>
              <ul className={styles.footerLinks}>
                <li>
                  <a href="#servicos">Serviços</a>
                </li>
                <li>
                  <a href="#barbeiros">Barbeiros</a>
                </li>
                <li>
                  <a href="#horario">Horário &amp; local</a>
                </li>
              </ul>
            </div>
            <div>
              <p className={styles.footerColTitle}>Conta</p>
              <ul className={styles.footerLinks}>
                <li>
                  <Link href="/login">Entrar</Link>
                </li>
                <li>
                  <Link href="/cadastro">Criar conta</Link>
                </li>
              </ul>
            </div>
          </div>
        </Container>
        <Container width="lg" className={styles.footerBottom}>
          <p className={styles.footerCopyright}>© {new Date().getFullYear()} Barbearia. Todos os direitos reservados.</p>
          <div className={styles.socialRow}>
            <a className={styles.socialIcon} href={CONTACT_INFO.instagramUrl} aria-label="Instagram">
              IG
            </a>
            <a className={styles.socialIcon} href={CONTACT_INFO.whatsappUrl} aria-label="WhatsApp">
              WA
            </a>
          </div>
        </Container>
      </footer>
    </>
  );
}
