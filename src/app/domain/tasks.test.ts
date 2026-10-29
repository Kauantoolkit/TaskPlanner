import { describe, expect, it } from 'vitest';
import {
  dayProgress, daysUntilDelivery, deliveryUrgency, formatDuration, isDoneOn, normalizeDraft,
  occursOn, tasksForDay, timeStatus, toggleDonePatch, type Task,
} from './tasks';

// 2026-03-16 é segunda-feira
const MON = '2026-03-16';
const TUE = '2026-03-17';
const SUN = '2026-03-15';

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    workspaceId: 'ws',
    text: 'tarefa',
    kind: 'once',
    date: MON,
    deliveryDate: null,
    recurringDays: [],
    completed: false,
    completedDates: [],
    categoryId: null,
    scheduledTime: null,
    estimatedDurationMinutes: null,
    yellowAlertMinutes: null,
    startedAt: null,
    assignedToId: 'm1',
    createdById: 'm1',
    createdAt: null,
    ...overrides,
  };
}

/** Data local no dia/hora dados. */
function at(day: string, time: string): Date {
  const [y, mo, d] = day.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi);
}

describe('occursOn', () => {
  it('única só no próprio dia', () => {
    const t = task({ kind: 'once', date: MON });
    expect(occursOn(t, MON)).toBe(true);
    expect(occursOn(t, TUE)).toBe(false);
  });

  it('todo dia aparece sempre', () => {
    expect(occursOn(task({ kind: 'daily', date: null }), SUN)).toBe(true);
  });

  it('semanal nos dias marcados (0 = domingo)', () => {
    const t = task({ kind: 'weekly', date: null, recurringDays: [0, 1] });
    expect(occursOn(t, SUN)).toBe(true);
    expect(occursOn(t, MON)).toBe(true);
    expect(occursOn(t, TUE)).toBe(false);
  });

  it('entrega aparece até o prazo, inclusive', () => {
    const t = task({ kind: 'delivery', date: null, deliveryDate: TUE });
    expect(occursOn(t, MON)).toBe(true);
    expect(occursOn(t, TUE)).toBe(true);
    expect(occursOn(t, '2026-03-18')).toBe(false);
  });
});

describe('conclusão', () => {
  it('recorrente conclui por dia, sem afetar os outros dias', () => {
    let t = task({ kind: 'daily', date: null });
    t = { ...t, ...toggleDonePatch(t, MON) };
    expect(isDoneOn(t, MON)).toBe(true);
    expect(isDoneOn(t, TUE)).toBe(false);
    t = { ...t, ...toggleDonePatch(t, MON) };
    expect(isDoneOn(t, MON)).toBe(false);
  });

  it('única alterna o flag completed', () => {
    const t = task({ kind: 'once' });
    expect(toggleDonePatch(t, MON)).toEqual({ completed: true });
  });

  it('entrega não tem conclusão', () => {
    expect(toggleDonePatch(task({ kind: 'delivery', deliveryDate: TUE }), MON)).toBeNull();
  });
});

describe('tasksForDay', () => {
  const list = [
    task({ id: 'sem-hora', text: 'Comprar pão' }),
    task({ id: 'tarde', text: 'Reunião', scheduledTime: '14:00' }),
    task({ id: 'manha', text: 'Academia', scheduledTime: '07:30' }),
    task({ id: 'outro-dia', date: TUE }),
  ];

  it('filtra pelo dia e ordena por horário, sem horário no fim', () => {
    expect(tasksForDay(list, MON).map(t => t.id)).toEqual(['manha', 'tarde', 'sem-hora']);
  });

  it('mantém a ordem original sem ordenação por horário', () => {
    expect(tasksForDay(list, MON, { sortByTime: false }).map(t => t.id)).toEqual(['sem-hora', 'tarde', 'manha']);
  });

  it('busca ignora maiúsculas', () => {
    expect(tasksForDay(list, MON, { search: 'REUN' }).map(t => t.id)).toEqual(['tarde']);
  });

  it('esconde concluídas quando pedido', () => {
    const withDone = [...list, task({ id: 'feita', completed: true })];
    expect(tasksForDay(withDone, MON, { showCompleted: false }).map(t => t.id)).not.toContain('feita');
  });
});

describe('dayProgress', () => {
  it('ignora entregas e conta recorrentes pelo dia', () => {
    const list = [
      task({ kind: 'once', completed: true }),
      task({ kind: 'daily', date: null, completedDates: [MON] }),
      task({ kind: 'daily', date: null, completedDates: [TUE] }),
      task({ kind: 'delivery', date: null, deliveryDate: TUE }),
    ];
    expect(dayProgress(list, MON)).toEqual({ total: 3, completed: 2, percentage: 67 });
  });

  it('dia vazio é 0%', () => {
    expect(dayProgress([], MON)).toEqual({ total: 0, completed: 0, percentage: 0 });
  });
});

describe('entregas', () => {
  const t = task({ kind: 'delivery', date: null, deliveryDate: '2026-03-20' });

  it('conta dias de calendário até o prazo', () => {
    expect(daysUntilDelivery(t, MON)).toBe(4);
    expect(daysUntilDelivery(task({ kind: 'once' }), MON)).toBeNull();
  });

  it('urgência: hoje, até 3 dias, resto', () => {
    expect(deliveryUrgency(t, '2026-03-20')).toBe('today');
    expect(deliveryUrgency(t, '2026-03-17')).toBe('soon');
    expect(deliveryUrgency(t, MON)).toBe('normal');
  });
});

describe('timeStatus', () => {
  // 09:00, 60 min, amarelo 15 min antes do fim → amarelo às 09:45, vermelho às 10:00
  const t = task({ scheduledTime: '09:00', estimatedDurationMinutes: 60, yellowAlertMinutes: 15 });

  it('segue a janela do horário', () => {
    expect(timeStatus(t, MON, at(MON, '08:59'))).toBe('normal');
    expect(timeStatus(t, MON, at(MON, '09:30'))).toBe('normal');
    expect(timeStatus(t, MON, at(MON, '09:45'))).toBe('yellow');
    expect(timeStatus(t, MON, at(MON, '10:00'))).toBe('red');
  });

  it('só alerta no dia de hoje', () => {
    expect(timeStatus(t, MON, at(TUE, '23:00'))).toBe('normal');
  });

  it('concluída e entrega nunca alertam', () => {
    expect(timeStatus({ ...t, completed: true }, MON, at(MON, '11:00'))).toBe('normal');
    expect(timeStatus({ ...t, kind: 'delivery', deliveryDate: TUE }, MON, at(MON, '11:00'))).toBe('normal');
  });

  it('padrões: 4h de duração, amarelo na metade', () => {
    const bare = task({ scheduledTime: '08:00' });
    expect(timeStatus(bare, MON, at(MON, '09:59'))).toBe('normal');
    expect(timeStatus(bare, MON, at(MON, '10:00'))).toBe('yellow');
    expect(timeStatus(bare, MON, at(MON, '12:00'))).toBe('red');
  });
});

describe('normalizeDraft', () => {
  it('limpa campos que não pertencem ao tipo', () => {
    const d = normalizeDraft({
      text: '  Ler  ', kind: 'weekly', date: MON, deliveryDate: TUE, recurringDays: [4, 1, 4],
      categoryId: null, scheduledTime: null, estimatedDurationMinutes: null, yellowAlertMinutes: null,
    });
    expect(d).toMatchObject({ text: 'Ler', date: null, deliveryDate: null, recurringDays: [1, 4] });
  });
});

it('formatDuration', () => {
  expect(formatDuration(45)).toBe('45min');
  expect(formatDuration(120)).toBe('2h');
  expect(formatDuration(90)).toBe('1h 30min');
});
