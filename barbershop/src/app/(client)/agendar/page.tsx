"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

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
    fetch(
      `/api/availability?barberId=${selectedBarberId}&serviceId=${selectedServiceId}&date=${selectedDate}`
    )
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
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 24px" }}>
      <h1>Agendar horário</h1>

      <section style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
        <label>
          Serviço
          <select
            value={selectedServiceId}
            onChange={(e) => {
              setSelectedServiceId(e.target.value);
              setSelectedBarberId("");
            }}
            style={{ width: "100%", padding: 10, marginTop: 4 }}
          >
            <option value="">Selecione...</option>
            {servicesData?.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.durationMin}min — R$ {s.price}
              </option>
            ))}
          </select>
        </label>

        {selectedService && (
          <label>
            Barbeiro
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 4 }}
            >
              <option value="">Selecione...</option>
              {selectedService.barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {selectedBarberId && (
          <label>
            Data
            <input
              type="date"
              value={selectedDate}
              min={todayISODate()}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 4 }}
            />
          </label>
        )}

        {selectedBarberId && (
          <div>
            <p style={{ marginBottom: 8 }}>Horários disponíveis</p>
            {loadingSlots && <p>Carregando...</p>}
            {!loadingSlots && slots.length === 0 && <p>Nenhum horário livre neste dia.</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {slots.map((slot) => (
                <button
                  key={slot}
                  disabled={booking}
                  onClick={() => handleBook(slot)}
                  style={{ padding: "8px 14px", border: "1px solid #1a1a1a", borderRadius: 6, background: "#fff" }}
                >
                  {new Date(slot).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                </button>
              ))}
            </div>
          </div>
        )}

        {feedback && (
          <p style={{ color: feedback.type === "error" ? "crimson" : "green" }}>{feedback.text}</p>
        )}
      </section>

      <section>
        <h2>Meus agendamentos</h2>
        {appointmentsData?.appointments.length === 0 && <p>Nenhum agendamento ainda.</p>}
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {appointmentsData?.appointments.map((a) => (
            <li
              key={a.id}
              style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <div>
                <strong>{a.service.name}</strong> com {a.barber.name}
                <br />
                {new Date(a.startsAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} — {a.status}
              </div>
              {(a.status === "SCHEDULED" || a.status === "CONFIRMED") && (
                <button onClick={() => handleCancel(a.id)} style={{ padding: "6px 12px" }}>
                  Cancelar
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
