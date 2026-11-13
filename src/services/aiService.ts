import { ChatTurn, Memory } from '../types/memory';

/**
 * Separated Local Demo Context Engine for "Ask Living Memory".
 * Designed so a real FastAPI + Gemini API backend can replace this adapter
 * without modifying UI components or exposing API keys in client code.
 */
export async function queryDemoContextEngine(
  question: string,
  memories: Memory[]
): Promise<ChatTurn> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  const q = question.toLowerCase();
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (q.includes('changed') && (q.includes('project') || q.includes('week'))) {
    return {
      id: `turn-${Date.now()}`,
      role: 'assistant',
      modeLabel: 'Demo Context Engine (Sample Data)',
      confidenceLabel: 'Grounded in 3 demo sources',
      timestamp: time,
      content:
        'Three key changes occurred across your projects this week:\n\n' +
        '1. Assignment Deadline Shifted Three Times: Originally Nov 15 (Class Discussion), discussed as Nov 18 (AI Project Team), and officially extended to Nov 20 (College Announcements & Academic Office Gmail).\n' +
        '2. Team Meeting Rescheduled: Moved to Nov 15 at 4:30 PM in Library Room B (Google Calendar Demo).\n' +
        '3. Review Priority Locked: Professor Meera requested a live provenance walkthrough for the Nov 18 Project Review.',
      relatedMemoryIds: ['mem-assignment-deadline', 'mem-team-meeting-shift', 'mem-project-review'],
      peopleMentioned: ['Alex', 'Sarah', 'Rahul', 'Professor Meera'],
      projectsMentioned: ['AI Assistant Project'],
      evidenceSnippets: [
        {
          sourceName: 'College Announcements & Academic Office Gmail',
          date: '2026-11-13 09:40',
          excerpt: 'Official Notice: Assignment deadline formally extended to November 20, 23:59.',
        },
        {
          sourceName: 'Google Calendar (Demo)',
          date: '2026-11-12 11:20',
          excerpt: 'Team Meeting updated to Nov 15, 16:30–17:30 · Library Room B.',
        },
      ],
      followUps: ['What deadlines are approaching?', 'Are there any conflicts between my emails and calendar?'],
    };
  }

  if (q.includes('deadline') || q.includes('approaching')) {
    return {
      id: `turn-${Date.now()}`,
      role: 'assistant',
      modeLabel: 'Demo Context Engine (Sample Data)',
      confidenceLabel: 'Grounded in Calendar, Gmail & WhatsApp Demo',
      timestamp: time,
      content:
        'Approaching deadlines and review milestones:\n\n' +
        '• Nov 14: Rahul’s Docker ingestion test log (AI Project Team).\n' +
        '• Nov 16: Sarah’s presentation slides 1–10 due ahead of rehearsal.\n' +
        '• Nov 18 (2:00 PM): Project Review with Professor Meera in Lab 304.\n' +
        '• Nov 20 (11:59 PM): AI Systems Assignment final submission (extended from Nov 15).\n' +
        '• Nov 22 (10:00 AM): Smart Campus Presentation Session in Auditorium B.',
      relatedMemoryIds: ['mem-sarah-slides', 'mem-project-review', 'mem-assignment-deadline'],
      peopleMentioned: ['Sarah', 'Rahul', 'Professor Meera'],
      projectsMentioned: ['AI Assistant Project', 'Smart Campus Project'],
      evidenceSnippets: [
        {
          sourceName: 'Gmail · Project review email',
          date: '2026-11-11 14:20',
          excerpt: 'Your Project Review is scheduled for November 18 at 2:00 PM in Innovation Lab 304.',
        },
      ],
      followUps: ['Who promised to complete the presentation?', 'Which meetings were rescheduled?'],
    };
  }

  if (q.includes('promised') || q.includes('presentation') || q.includes('who')) {
    return {
      id: `turn-${Date.now()}`,
      role: 'assistant',
      modeLabel: 'Demo Context Engine (Sample Data)',
      confidenceLabel: 'Confirmed in WhatsApp & Gmail Demo',
      timestamp: time,
      content:
        'Sarah promised to complete the presentation slide deck by Monday evening (Nov 16) in both the AI Project Team WhatsApp export and her Gmail follow-up email.\n\n' +
        'Note: No slide deck link has appeared in your uploaded sources yet.',
      relatedMemoryIds: ['mem-sarah-slides', 'mem-project-review'],
      peopleMentioned: ['Sarah', 'Alex', 'Rahul'],
      projectsMentioned: ['AI Assistant Project'],
      evidenceSnippets: [
        {
          sourceName: 'AI Project Team (WhatsApp)',
          date: '2026-11-12 18:10',
          excerpt: 'Sarah: I will finish the presentation slides by Monday evening before our dry run.',
        },
        {
          sourceName: 'Gmail · Meeting follow-up',
          date: '2026-11-12 18:25',
          excerpt: 'I will complete the presentation slides and error analysis tables by Nov 16 evening.',
        },
      ],
      followUps: ['What changed about my project this week?', 'Show me unanswered questions from my groups.'],
    };
  }

  if (q.includes('rescheduled') || q.includes('meeting')) {
    return {
      id: `turn-${Date.now()}`,
      role: 'assistant',
      modeLabel: 'Demo Context Engine (Sample Data)',
      confidenceLabel: 'Confirmed in Google Calendar Demo',
      timestamp: time,
      content:
        'The AI Project Team weekly sync was rescheduled from its usual Friday 3:00 PM slot to November 15 at 4:30 PM in Library Room B to avoid overlapping with Rahul’s lab.',
      relatedMemoryIds: ['mem-team-meeting-shift'],
      peopleMentioned: ['Alex', 'Sarah', 'Rahul'],
      projectsMentioned: ['AI Assistant Project'],
      evidenceSnippets: [
        {
          sourceName: 'Google Calendar (Demo)',
          date: '2026-11-12 11:20',
          excerpt: 'Team Meeting updated to Nov 15, 16:30–17:30 · Library Room B.',
        },
      ],
      followUps: ['Are there any conflicts between my emails and calendar?'],
    };
  }

  if (q.includes('professor') || q.includes('meera') || q.includes('announce')) {
    return {
      id: `turn-${Date.now()}`,
      role: 'assistant',
      modeLabel: 'Demo Context Engine (Sample Data)',
      confidenceLabel: 'Confirmed across Faculty Gmail & College Announcements',
      timestamp: time,
      content:
        'Professor Meera issued three key updates across Gmail and College Announcements:\n\n' +
        '1. Extended the AI Systems Assignment deadline to November 20, 23:59.\n' +
        '2. Scheduled the mid-term Project Review for Nov 18 at 2:00 PM in Innovation Lab 304.\n' +
        '3. Announced the Department Showcase Presentation Session for Nov 22 at 10:00 AM in Auditorium B.',
      relatedMemoryIds: ['mem-assignment-deadline', 'mem-project-review', 'mem-smart-campus-telemetry'],
      peopleMentioned: ['Professor Meera'],
      projectsMentioned: ['AI Assistant Project', 'Smart Campus Project'],
      evidenceSnippets: [
        {
          sourceName: 'College Announcements',
          date: '2026-11-13 09:40',
          excerpt: 'Official Notice: Assignment deadline formally extended to November 20, 23:59.',
        },
      ],
      followUps: ['Which emails contain important decisions?'],
    };
  }

  if (q.includes('email') && q.includes('decision')) {
    return {
      id: `turn-${Date.now()}`,
      role: 'assistant',
      modeLabel: 'Demo Context Engine (Sample Data)',
      confidenceLabel: 'Extracted from Gmail Demo Feed',
      timestamp: time,
      content:
        'Your Gmail Demo Feed contains 3 decision-relevant threads:\n\n' +
        '• Academic Office (Nov 13): Formal extension of Assignment deadline to Nov 20.\n' +
        '• Professor Meera (Nov 11): Confirmed Nov 18 Lab 304 review format emphasizing live provenance.\n' +
        '• Sarah (Nov 12): Confirmed Nov 16 slide delivery milestone before Nov 17 dry run.',
      relatedMemoryIds: ['mem-assignment-deadline', 'mem-project-review', 'mem-sarah-slides'],
      peopleMentioned: ['Professor Meera', 'Sarah'],
      projectsMentioned: ['AI Assistant Project'],
      evidenceSnippets: [
        {
          sourceName: 'Gmail · Project review email',
          date: '2026-11-11 14:20',
          excerpt: 'Please prepare a 10-minute walkthrough demonstrating how conflicting deadlines are preserved.',
        },
      ],
    };
  }

  if (q.includes('unanswered') || q.includes('question')) {
    return {
      id: `turn-${Date.now()}`,
      role: 'assistant',
      modeLabel: 'Demo Context Engine (Sample Data)',
      confidenceLabel: 'From Unanswered Question Detector',
      timestamp: time,
      content:
        'Three open questions are currently tracked across your groups and emails:\n\n' +
        '1. Auditorium B dual HDMI output availability (Asked by Alex in AI Project Team — Unanswered).\n' +
        '2. Whether citation latency benchmarks are mandatory (Asked by Rahul in Class Discussion — Rubric PDF Section 4 indicates 15% weight).\n' +
        '3. Docker build stability before Monday’s dry run (Asked by Sarah in Gmail — Rahul promised test log tomorrow).',
      relatedMemoryIds: ['mem-q-rubric-citation', 'mem-sarah-slides', 'mem-smart-campus-telemetry'],
      peopleMentioned: ['Alex', 'Rahul', 'Sarah'],
      projectsMentioned: ['AI Assistant Project', 'Smart Campus Project'],
      evidenceSnippets: [
        {
          sourceName: 'Class Discussion (WhatsApp)',
          date: '2026-11-12 20:50',
          excerpt: 'Rahul: Has Professor Meera confirmed if latency benchmarks are mandatory or bonus?',
        },
      ],
    };
  }

  if (q.includes('decide') && (q.includes('last month') || q.includes('originally') || q.includes('decide'))) {
    return {
      id: `turn-${Date.now()}`,
      role: 'assistant',
      modeLabel: 'Demo Context Engine (Sample Data)',
      confidenceLabel: 'Confirmed in Decision Intelligence',
      timestamp: time,
      content:
        'Originally in AI Project Team (Nov 10), you, Sarah, and Rahul decided to build an append-only versioned memory schema so old deadlines are never silently overwritten.\n\n' +
        'Earlier on Oct 28 (Smart Campus notes), you also decided on a 15-minute rolling average threshold for classroom occupancy calibration.',
      relatedMemoryIds: ['mem-arch-decision', 'mem-smart-campus-telemetry'],
      peopleMentioned: ['Alex', 'Sarah', 'Rahul'],
      projectsMentioned: ['AI Assistant Project', 'Smart Campus Project'],
      evidenceSnippets: [
        {
          sourceName: 'AI Project Team (WhatsApp)',
          date: '2026-11-10 20:05',
          excerpt: 'Alex: Let’s never silently overwrite old deadlines—store every version with its source.',
        },
      ],
    };
  }

  if (q.includes('conflict') || (q.includes('email') && q.includes('calendar'))) {
    return {
      id: `turn-${Date.now()}`,
      role: 'assistant',
      modeLabel: 'Demo Context Engine (Sample Data)',
      confidenceLabel: 'Detected in Change & Conflict Center',
      timestamp: time,
      content:
        'Yes — there is an active conflict between your Academic Office Gmail and Google Calendar:\n\n' +
        '• Google Calendar (Demo) still lists "Assignment Deadline" on November 15 at 23:59.\n' +
        '• Academic Office Gmail & College Announcements updated the official deadline to November 20 at 23:59.',
      relatedMemoryIds: ['mem-assignment-deadline'],
      peopleMentioned: ['Professor Meera'],
      projectsMentioned: ['AI Assistant Project'],
      evidenceSnippets: [
        {
          sourceName: 'Google Calendar (Demo)',
          date: '2026-11-15 23:59',
          excerpt: 'Calendar entry still set to Nov 15 while official email moved deadline to Nov 20.',
        },
      ],
      followUps: ['What changed about my project this week?'],
    };
  }

  const matches = memories.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.currentInformation.toLowerCase().includes(q)
  );
  const top = matches.length > 0 ? matches.slice(0, 3) : memories.slice(0, 2);

  return {
    id: `turn-${Date.now()}`,
    role: 'assistant',
    modeLabel: 'Demo Context Engine (Sample Data)',
    confidenceLabel: `${top.length} matching demo records`,
    timestamp: time,
    content:
      top.map((m) => `• ${m.title}: ${m.currentInformation}`).join('\n\n') +
      '\n\n(Demo Mode: Live Gemini synthesis runs on the FastAPI backend once configured.)',
    relatedMemoryIds: top.map((m) => m.id),
    evidenceSnippets: top.flatMap((m) =>
      m.evidence.slice(0, 1).map((ev) => ({
        sourceName: ev.sourceName,
        date: ev.recordedTime,
        excerpt: ev.excerpt,
      }))
    ),
  };
}
