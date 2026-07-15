"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button, Card, Container, PageHeader, SelectField, StatusBadge, TextField } from "@/components/ui";
import styles from "./agendar.module.css";

interface Barber {
  id: string;
  name: string;
}
interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: string;
  barbers: Barber[];
}
interface Appointment {
  id: string;
  startsAt: string;
  status: string;
  service: { name: string; price: string };
  barber: { name: string };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AgendarPage() {
  const { data: servicesData } = useSWR<{ services: Service[] }>("/api/services", fetcher);
  const { data: appointmentsData, mutate: refetchAppointments } = useSWR<{ appointments: Appointment[] }>(
    "/api/appointments",
    fetcher,
    { refreshInterval: 30_000 } // polling — ver trade-off na seção 7 da explicação técnica
  );

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayISODate());
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const selectedService = servicesData?.services.find((s) => s.id === selectedServiceId);

  useEffect(() => {
    if (!selectedServiceId || !selectedBarberId || !selectedDate) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    fetch(`/api/availability?barberId=${selectedBarberId}&serviceId=${selectedServiceId}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedServiceId, selectedBarberId, selectedDate]);

  async function handleBook(startsAt: string) {
    setBooking(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barberId: selectedBarberId, serviceId: selectedServiceId, startsAt }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Trata especificamente o 409 (conflito de horário) para orientar
        // o usuário a escolher outro horário, já que a lista pode estar
        // levemente desatualizada entre o fetch e o clique.
        setFeedback({ type: "error", text: data.error ?? "Erro ao agendar" });
        setSlots((prev) => prev.filter((s) => s !== startsAt));
        return;
      }

      setFeedback({ type: "success", text: "Agendamento confirmado!" });
      setSlots((prev) => prev.filter((s) => s !== startsAt));
      refetchAppointments();
    } catch {
      setFeedback({ type: "error", text: "Erro de conexão. Tente novamente." });
    } finally {
      setBooking(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancelar este agendamento?")) return;
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Erro ao cancelar");
      return;
    }
    refetchAppointments();
  }

  return (
    <Container>
      <PageHeader title="Agendar horário" subtitle="Escolha o serviço, o profissional e o melhor horário para você." />

      <Card className={styles.bookingCard}>
        <SelectField
          label="Serviço"
          value={selectedServiceId}
          onChange={(e) => {
            setSelectedServiceId(e.target.value);
            setSelectedBarberId("");
          }}
        >
          <option value="">Selecione...</option>
          {servicesData?.services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.durationMin}min — R$ {s.price}
            </option>
          ))}
        </SelectField>

        {selectedService && (
          <SelectField label="Barbeiro" value={selectedBarberId} onChange={(e) => setSelectedBarberId(e.target.value)}>
            <option value="">Selecione...</option>
            {selectedService.barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </SelectField>
        )}

        {selectedBarberId && (
          <TextField
            label="Data"
            type="date"
            value={selectedDate}
            min={todayISODate()}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        )}

        {selectedBarberId && (
          <div>
            <p className={styles.slotsLabel}>Horários disponíveis</p>
            {loadingSlots && <p className={styles.muted}>Carregando...</p>}
            {!loadingSlots && slots.length === 0 && <p className={styles.muted}>Nenhum horário livre neste dia.</p>}
            <div className={styles.slotsGrid}>
              {slots.map((slot) => (
                <Button key={slot} variant="secondary" size="sm" disabled={booking} onClick={() => handleBook(slot)}>
                  {new Date(slot).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Sao_Paulo",
                  })}
                </Button>
              ))}
            </div>
          </div>
        )}

        {feedback && (
          <p className={feedback.type === "error" ? styles.feedbackError : styles.feedbackSuccess} role="status">
            {feedback.text}
          </p>
        )}
      </Card>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Meus agendamentos</h2>
        {appointmentsData?.appointments.length === 0 && <p className={styles.muted}>Nenhum agendamento ainda.</p>}
        <ul className={styles.list}>
          {appointmentsData?.appointments.map((a) => (
            <li key={a.id}>
              <Card compact className={styles.appointmentCard}>
                <div>
                  <strong>{a.service.name}</strong> com {a.barber.name}
                  <br />
                  <span className={styles.muted}>
                    {new Date(a.startsAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </span>{" "}
                  <StatusBadge status={a.status} />
                </div>
                {(a.status === "SCHEDULED" || a.status === "CONFIRMED") && (
                  <Button variant="danger" size="sm" onClick={() => handleCancel(a.id)}>
                    Cancelar
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
