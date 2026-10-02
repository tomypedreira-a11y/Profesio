// Libro de sesiones de un paciente en PDF (copia de la historia clínica, Ley 26.529). Solo en el servidor:
// lo genera el route handler de /app/pacientes/[id]/libro y no llega al JavaScript del navegador.
// Recibe los textos ya armados (fechas en la zona del perfil); acá solo se diagrama.
import "server-only";
import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

export type SessionBookEntry = {
  date: string; // "Martes 30 de septiembre de 2026 · 18:00"
  details: string[]; // modalidad y, si se corrigió, "Corregida el 01/10/2026"
  content: string;
};

export type SessionBookData = {
  professional: { name: string; license: string | null };
  patient: { name: string; details: { label: string; value: string }[] };
  entries: SessionBookEntry[];
  generatedAt: string; // "02/10/2026 17:30"
};

// Las fuentes de la app (OFL, ver fonts/): con las estándar del PDF, lo que no sea Latin-1 saldría roto.
// next.config.ts las incluye en la función (outputFileTracingIncludes).
const FONTS = path.join(process.cwd(), "src/lib/pdf/fonts");
Font.register({
  family: "Outfit",
  fonts: [
    { src: path.join(FONTS, "Outfit-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONTS, "Outfit-SemiBold.ttf"), fontWeight: 600 },
  ],
});
Font.register({ family: "Lora", src: path.join(FONTS, "Lora-SemiBold.ttf"), fontWeight: 600 });
// Sin guiones de corte: react-pdf parte las palabras con reglas del inglés.
Font.registerHyphenationCallback((word) => [word]);

const A4_HEIGHT = 841.89; // en puntos
const COLORS = { text: "#2b2420", muted: "#6f6156", border: "#ddd2c0", accent: "#4f7a4f" };

const styles = StyleSheet.create({
  page: {
    fontFamily: "Outfit",
    fontSize: 10.5,
    lineHeight: 1.45,
    color: COLORS.text,
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 56,
  },
  runningHeader: { position: "absolute", top: 28, left: 56, right: 56, fontSize: 8.5, color: COLORS.muted },
  title: { fontFamily: "Lora", fontWeight: 600, fontSize: 20, lineHeight: 1.2 },
  subtitle: { color: COLORS.muted, marginTop: 2 },
  professional: { marginTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  strong: { fontWeight: 600 },
  section: { marginTop: 18 },
  sectionTitle: { fontFamily: "Lora", fontWeight: 600, fontSize: 13, marginBottom: 6 },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 120, color: COLORS.muted },
  value: { flex: 1 },
  empty: { color: COLORS.muted },
  entry: { paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  entryDate: { fontWeight: 600 },
  entryDetails: { fontSize: 9, color: COLORS.muted, marginBottom: 4 },
  // Cada texto del pie, fijo y posicionado por su cuenta y con `top`: react-pdf diagrama fuera de la hoja un texto
  // dinámico (Página X de Y) posicionado con `bottom`.
  footer: { position: "absolute", top: A4_HEIGHT - 40, left: 56, right: 56, fontSize: 8.5, lineHeight: 1, color: COLORS.muted },
  footerRight: { textAlign: "right" },
});

function SessionBook({ professional, patient, entries, generatedAt }: SessionBookData) {
  return (
    <Document title={`Libro de sesiones · ${patient.name}`} author={professional.name} creator="Profesio" producer="Profesio" language="es">
      <Page size="A4" style={styles.page}>
        {/* Desde la segunda página, de quién es el libro (por si se imprimen sueltas). */}
        <Text
          style={styles.runningHeader}
          fixed
          render={({ pageNumber }) => (pageNumber > 1 ? `Libro de sesiones · ${patient.name}` : "")}
        />

        <Text style={styles.title}>Libro de sesiones</Text>
        <Text style={styles.subtitle}>Copia de la historia clínica (Ley 26.529)</Text>

        <View style={styles.professional}>
          <Text style={styles.strong}>{professional.name}</Text>
          {professional.license && <Text>Matrícula: {professional.license}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paciente</Text>
          {patient.details.map((d) => (
            <View key={d.label} style={styles.row}>
              <Text style={styles.label}>{d.label}</Text>
              <Text style={styles.value}>{d.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sesiones</Text>
          {entries.length === 0 ? (
            <Text style={styles.empty}>Todavía no hay anotaciones finalizadas.</Text>
          ) : (
            entries.map((e, i) => (
              <View key={i} style={styles.entry}>
                {/* La fecha no queda sola al pie de una página: pasa con el comienzo del texto. */}
                <View minPresenceAhead={36}>
                  <Text style={styles.entryDate}>{e.date}</Text>
                  <Text style={styles.entryDetails}>{e.details.join(" · ")}</Text>
                </View>
                <Text>{e.content}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footer} fixed>
          Generado el {generatedAt} con Profesio
        </Text>
        <Text
          style={[styles.footer, styles.footerRight]}
          fixed
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}

// El PDF en memoria: no se escribe en disco ni se guarda en ningún lado.
export function renderSessionBook(data: SessionBookData) {
  return renderToBuffer(<SessionBook {...data} />);
}
