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

  async generateReportComment(opts: {
    studentName: string;
    className: string;
    avg: number;
    mention: string;
    grades: { subject: string; score: number; coefficient: number }[];
  }): Promise<string> {
    if (!this.enabled || !this.client) {
      throw new Error("L'assistant IA n'est pas encore configuré.");
    }

    const { studentName, className, avg, mention, grades } = opts;
    const gradeList = grades
      .map((g) => `  - ${g.subject} : ${g.score}/20 (coef. ${g.coefficient})`)
      .join('\n');

    const prompt =
      `Rédige une appréciation de bulletin scolaire pour un(e) élève de ${className}.\n\n` +
      `Données :\n` +
      `- Nom : ${studentName}\n` +
      `- Moyenne générale : ${avg.toFixed(2)}/20\n` +
      `- Mention : ${mention}\n` +
      `- Notes par matière :\n${gradeList}\n\n` +
      `Rédigez une appréciation de 2-3 phrases, bienveillante mais honnête, adaptée à la moyenne. ` +
      `Sans émojis. Vouvoiement non. Tutoyer l'élève. Répondez uniquement avec le texte de l'appréciation.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        system:
          'Tu es un professeur principal dans une école d\'Afrique francophone (Togo). ' +
          'Tu rédiges des appréciations de bulletins scolaires en français, de manière concise et professionnelle. ' +
          'Réponds uniquement avec le texte de l\'appréciation, sans introduction ni guillemets.',
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content[0];
      if (text.type === 'text') return text.text.trim();
      return '';
    } catch (err: any) {
      this.logger.error('Report comment generation error:', err?.message);
      throw new Error("Impossible de générer l'appréciation. Réessayez.");
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
