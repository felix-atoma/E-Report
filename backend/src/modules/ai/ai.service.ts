import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `Tu es l'assistant IA de NovaBulletin, une plateforme de gestion scolaire numérique pour les écoles d'Afrique francophone (principalement le Togo).

## Contexte de la plateforme
NovaBulletin permet aux établissements scolaires de :
- Gérer les notes et calculer les moyennes automatiquement (système français 0-20)
- Générer des bulletins scolaires en PDF avec le logo de l'école
- Envoyer les bulletins aux parents par WhatsApp et Email
- Gérer les frais scolaires (TMoney, Flooz, espèces, virement)
- Bloquer automatiquement l'accès aux bulletins si les frais sont impayés
- Gérer les classes, matières, emplois du temps, devoirs, quiz

## Rôles dans la plateforme
- **ADMIN** : accès complet, gère l'établissement, crée les utilisateurs, voit les analytics
- **TEACHER (Enseignant)** : saisit les notes pour ses classes assignées, publie les bulletins
- **BURSAR (Économe)** : gère les frais scolaires et enregistre les paiements
- **PARENT** : consulte les résultats de ses enfants, reçoit les bulletins
- **STUDENT (Élève)** : consulte ses propres résultats et bulletins
- **SUPERADMIN** : gère toutes les écoles sur la plateforme

## Système scolaire togolais
- Maternelle : PS, MS, GS
- Primaire : CP, CE1, CE2, CM1, CM2 (examen : CEPD)
- Collège : 6ème, 5ème, 4ème, 3ème (examen : BEPC)
- Lycée : Seconde, Première, Terminale (examen : BAC, séries : A1, A2, A4, B, C, D)
- 3 trimestres par année scolaire (Septembre-Décembre, Janvier-Mars, Avril-Juin)
- Note sur 20, moyenne générale = Σ(note × coefficient) / Σ(coefficients)
- Monnaie : FCFA (XOF)

## Instructions
- Réponds TOUJOURS en français, de façon claire et concise
- Tu connais parfaitement NovaBulletin et peux aider avec toutes les fonctionnalités
- Si tu ne sais pas quelque chose sur NovaBulletin, dis-le honnêtement
- Pour les questions hors sujet (politique, etc.), ramène poliment la conversation vers NovaBulletin
- Utilise des émojis avec modération pour rendre les réponses plus lisibles
- Réponds en 2-5 phrases maximum sauf si une explication détaillée est nécessaire`;

/** Résultat de la transcription d'une épreuve par l'IA. */
export interface ExamPaperTranscription {
  subject: string;
  title: string;
  className: string;
  academicYear: string;
  duration: string;
  coefficient: string;
  contentHtml: string;
  warnings: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null = null;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY', '');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.enabled = true;
      this.logger.log('AI Assistant: Claude Sonnet 4.6 ready');
    } else {
      this.enabled = false;
      this.logger.warn('ANTHROPIC_API_KEY not set — AI assistant disabled');
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Observation du professeur titulaire pour un bulletin, rédigée à la 3e personne et accordée
   * au genre de l'élève (sexe M / F ; formulation épicène s'il est inconnu).
   * Le texte est proposé au titulaire, qui le relit et le modifie avant de l'enregistrer.
   */
  async generateReportComment(opts: {
    studentName: string;
    sex?: 'M' | 'F' | null;
    className: string;
    termName?: string;
    isPrimary?: boolean;
    avg: number;
    mention: string;
    rank?: number | null;
    classSize?: number | null;
    classAverage?: number | null;
    conduct?: string | null;
    absentDays?: number | null;
    lateHours?: string | null;
    grades: { subject: string; score: number; coefficient: number; maxScore?: number | null }[];
  }): Promise<string> {
    if (!this.enabled || !this.client) {
      throw new Error("L'assistant IA n'est pas encore configuré.");
    }

    // Au primaire, chaque matière est présentée sur son barème (/10 ou /20) ; la moyenne générale sur 10.
    // Les notes sont stockées sur 20.
    const scale = opts.isPrimary ? 10 : 20;
    const fmt = (v: number) => (opts.isPrimary ? v / 2 : v).toFixed(2).replace('.', ',');
    const subjectMax = (g: { maxScore?: number | null }) => (opts.isPrimary && (g.maxScore ?? 20) <= 10 ? 10 : 20);
    const fmtSubject = (g: { score: number; maxScore?: number | null }) =>
      `${((g.score * subjectMax(g)) / 20).toFixed(2).replace('.', ',')}/${subjectMax(g)}`;
    const gradeList = opts.grades
      .map((g) => `- ${g.subject} : ${fmtSubject(g)}${opts.isPrimary ? '' : ` (coef. ${g.coefficient})`}`)
      .join('\n');

    const gender =
      opts.sex === 'F' ? "une élève (fille) : accorde TOUT au féminin singulier (ex. « sérieuse », « appliquée », « elle »)"
      : opts.sex === 'M' ? "un élève (garçon) : accorde TOUT au masculin singulier (ex. « sérieux », « appliqué », « il »)"
      : "un·e élève dont le sexe n'est pas renseigné : utilise uniquement des tournures épicènes (ex. « l'élève », « fait preuve de », « des efforts sont attendus ») et aucun adjectif ni participe accordé au masculin ou au féminin";

    const facts = [
      `Élève : ${opts.studentName} — ${gender}.`,
      `Classe : ${opts.className}${opts.termName ? ` — ${opts.termName}` : ''}.`,
      `Moyenne générale : ${fmt(opts.avg)}/${scale} (mention : ${opts.mention}).`,
      opts.rank ? `Rang : ${opts.rank}${opts.classSize ? ` sur ${opts.classSize}` : ''}.` : null,
      opts.classAverage != null ? `Moyenne de la classe : ${fmt(opts.classAverage)}/${scale}.` : null,
      opts.conduct ? `Conduite : ${opts.conduct}.` : null,
      opts.absentDays != null ? `Absences non justifiées : ${opts.absentDays} jour(s).` : null,
      opts.lateHours ? `Retards : ${opts.lateHours} h.` : null,
      `Notes par matière :\n${gradeList}`,
    ].filter(Boolean).join('\n');

    const system =
      "Tu es professeur titulaire (professeur principal) dans un établissement scolaire d'Afrique francophone (Togo). " +
      "Tu rédiges l'observation générale du titulaire qui figure sur le bulletin trimestriel.\n\n" +
      "Règles de rédaction :\n" +
      "- 2 ou 3 phrases, 45 mots au maximum, en français correct et soutenu.\n" +
      "- Écris à la 3e personne, jamais au « tu » ni au « vous » (ex. « Élève sérieuse qui… », « Il doit… »).\n" +
      "- Respecte strictement les accords en genre et en nombre (adjectifs, participes passés, pronoms) avec le sexe de l'élève indiqué.\n" +
      "- Appuie-toi sur les résultats : souligne les points forts réels, nomme une ou deux matières à améliorer si la moyenne ou certaines notes sont faibles, et termine par un encouragement ou un conseil concret.\n" +
      "- Ton bienveillant mais honnête, adapté au niveau : ne félicite pas un résultat insuffisant.\n" +
      "- N'invente aucun fait absent des données. Ne cite pas les notes chiffrées.\n" +
      "- Réponds uniquement par le texte de l'observation : sans titre, sans guillemets, sans émoji, sans le nom de l'élève.";

    try {
      const params: Anthropic.Beta.MessageCreateParamsNonStreaming = {
        model: 'claude-opus-5-5',
        max_tokens: 4000,
        // Texte court et bien cadré : un effort faible suffit et limite le coût
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        system,
        messages: [{ role: 'user', content: facts }],
      };
      // Si le modèle décline (faux positif d'un filtre), l'API relance sur un autre modèle.
      // `fallbacks` est plus récent que le SDK installé (0.100) : ajouté hors du typage.
      const response = await this.client.beta.messages.create(
        { ...params, fallbacks: 'default' } as Anthropic.Beta.MessageCreateParamsNonStreaming,
      );

      if (response.stop_reason === 'refusal') {
        throw new Error('refusal');
      }
      const text = response.content
        .map((b: any) => (b.type === 'text' ? b.text : ''))
        .join('')
        .trim()
        .replace(/^["«»“”\s]+|["«»“”\s]+$/g, '');
      if (!text) throw new Error('empty response');
      return text;
    } catch (err: any) {
      if (err instanceof Anthropic.RateLimitError) {
        this.logger.warn('Report comment: rate limited');
        throw new Error("Trop de demandes en même temps. Réessayez dans quelques secondes.");
      }
      if (err instanceof Anthropic.APIError) {
        this.logger.error(`Report comment API error ${err.status}: ${err.message}`);
        // Crédit du compte Anthropic épuisé : le signaler clairement au lieu de « Réessayez »
        if (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message)) {
          throw new Error("Le service d'IA est momentanément indisponible (crédit épuisé). Rédigez l'observation manuellement ou contactez l'administrateur.");
        }
      } else {
        this.logger.error('Report comment generation error:', err?.message);
      }
      throw new Error("Impossible de générer l'observation. Réessayez.");
    }
  }

  /**
   * Transcrit une épreuve importée par un professeur (PDF, photos des pages, ou texte extrait d'un
   * fichier Word) en HTML simple et modifiable, et relève les informations de l'en-tête (matière,
   * durée, coefficient…). Le professeur relit et corrige ensuite le résultat avant de le soumettre.
   */
  async transcribeExamPaper(input: {
    files: { mime: string; base64: string }[];
    extractedText?: string;
  }): Promise<ExamPaperTranscription> {
    if (!this.enabled || !this.client) {
      throw new Error("L'assistant IA n'est pas configuré : saisissez l'épreuve manuellement.");
    }

    const system =
      "Tu transcris des sujets d'examen (devoirs, compositions, examens blancs) d'établissements scolaires " +
      "d'Afrique francophone, à partir de photos ou de PDF, pour qu'un professeur puisse les corriger et les imprimer.\n\n" +
      "Règles :\n" +
      "- Transcris fidèlement TOUT le texte du sujet, dans l'ordre : consignes, exercices, questions, barème, données. " +
      "Ne résous rien, n'ajoute rien, ne reformule pas. Corrige seulement les erreurs évidentes de lecture (lettres mal lues).\n" +
      "- N'inclus PAS l'en-tête administratif (nom de l'école, adresse, année scolaire, classe, durée, coefficient, matière) " +
      "dans le corps : relève ces informations dans les champs prévus. Laisse un champ vide s'il n'apparaît pas.\n" +
      "- Corps en HTML simple, uniquement avec : <h2>, <h3>, <p>, <strong>, <em>, <u>, <sup>, <sub>, <br>, " +
      "<ol>, <ul>, <li>, <table>, <tr>, <th>, <td>. Aucun attribut, aucun style, aucune image.\n" +
      "- Titres d'exercices et de parties en <h2> ou <h3> (ex. « Exercice 1 (5 points) »). Garde la numérotation d'origine (1., a), b)…).\n" +
      "- Mathématiques et sciences : écris les formules en texte lisible avec les caractères Unicode " +
      "(×, ÷, ±, ≤, ≥, ≠, ≈, √, π, ∞, ∈, ∉, ⊂, ∪, ∩, →, ⇒, ⇔, °, α, β, Δ…), exposants et indices avec <sup> et <sub> " +
      "(ex. x<sup>2</sup>, H<sub>2</sub>O), fractions sous la forme (a)/(b). Jamais de LaTeX.\n" +
      "- Tableaux du sujet en <table>. Une figure ou un schéma impossible à transcrire : écris [Figure : courte description] à sa place.\n" +
      "- Passage illisible : écris [illisible] et signale-le dans « warnings ».";

    const content: any[] = input.files.map((f) =>
      f.mime === 'application/pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.base64 } }
        : { type: 'image', source: { type: 'base64', media_type: f.mime, data: f.base64 } },
    );
    if (input.extractedText) {
      content.push({ type: 'text', text: `Texte extrait du fichier Word du professeur :\n\n${input.extractedText}` });
    }
    content.push({
      type: 'text',
      text: input.files.length > 1
        ? `Voici les ${input.files.length} pages du sujet, dans l'ordre. Transcris le sujet complet.`
        : 'Transcris ce sujet.',
    });

    const schema = {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Matière, ex. « Mathématiques »' },
        title: { type: 'string', description: 'Intitulé de l’épreuve, ex. « Devoir du deuxième trimestre »' },
        className: { type: 'string', description: 'Classe, ex. « 1ère D »' },
        academicYear: { type: 'string', description: 'Année scolaire, ex. « 2024-2025 »' },
        duration: { type: 'string', description: 'Durée, ex. « 3h »' },
        coefficient: { type: 'string', description: 'Coefficient, ex. « 3 »' },
        contentHtml: { type: 'string', description: 'Corps du sujet en HTML simple' },
        warnings: { type: 'string', description: 'Passages illisibles ou douteux à vérifier ; vide sinon' },
      },
      required: ['subject', 'title', 'className', 'academicYear', 'duration', 'coefficient', 'contentHtml', 'warnings'],
      additionalProperties: false,
    };

    try {
      const params = {
        model: 'claude-opus-5-5',
        max_tokens: 32000,
        // Transcription fidèle : effort moyen (lecture attentive sans surcoût)
        output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
        betas: ['server-side-fallback-2026-07-01'],
        system,
        messages: [{ role: 'user', content }],
        // Si le modèle décline (faux positif d'un filtre), l'API relance sur un autre modèle.
        fallbacks: 'default',
      };
      // Long sujet = longue réponse : flux + message final pour éviter les délais d'attente HTTP.
      // `output_config.format` et `fallbacks` sont plus récents que le SDK installé : hors typage.
      const response = await this.client.beta.messages
        .stream(params as unknown as Anthropic.Beta.MessageCreateParamsStreaming)
        .finalMessage();

      if (response.stop_reason === 'refusal') throw new Error('refusal');
      if (response.stop_reason === 'max_tokens') {
        throw new Error("Le sujet est trop long pour être transcrit d'un coup. Importez-le en plusieurs parties.");
      }
      const text = response.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('');
      const data = JSON.parse(text) as ExamPaperTranscription;
      if (!data.contentHtml?.trim()) throw new Error('empty transcription');
      return data;
    } catch (err: any) {
      if (err instanceof Anthropic.RateLimitError) {
        throw new Error('Trop de demandes en même temps. Réessayez dans quelques secondes.');
      }
      if (err instanceof Anthropic.APIError) {
        this.logger.error(`Exam transcription API error ${err.status}: ${err.message}`);
        if (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message)) {
          throw new Error("Le service d'IA est momentanément indisponible (crédit épuisé). Saisissez l'épreuve manuellement.");
        }
        throw new Error("La transcription par l'IA a échoué. Réessayez ou saisissez l'épreuve manuellement.");
      }
      if (err instanceof Error && /trop long/.test(err.message)) throw err;
      this.logger.error('Exam transcription error:', err?.message);
      throw new Error("La transcription par l'IA a échoué. Réessayez ou saisissez l'épreuve manuellement.");
    }
  }

  async chat(message: string, role: string, context?: string): Promise<string> {
    if (!this.enabled || !this.client) {
      return "L'assistant IA n'est pas encore configuré. Veuillez contacter l'administrateur de la plateforme.";
    }

    try {
      const userContent = context
        ? `[Contexte : Utilisateur avec le rôle ${role}, page actuelle: ${context}]\n\n${message}`
        : `[Rôle: ${role}]\n\n${message}`;

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      });

      const text = response.content[0];
      if (text.type === 'text') return text.text;
      return "Je n'ai pas pu générer une réponse. Veuillez réessayer.";
    } catch (err: any) {
      this.logger.error('AI chat error:', err?.message);
      return "Une erreur s'est produite. Veuillez réessayer dans quelques instants.";
    }
  }
}
