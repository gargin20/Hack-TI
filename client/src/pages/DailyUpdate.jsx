import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Activity, BadgeIndianRupee, Briefcase, CheckCircle2, Loader2, Target } from 'lucide-react';
import { clearDailyUpdateCooldown } from '../features/dailyUpdate/dailyUpdateSlice';
import { fetchTodayDailyUpdate, submitDailyUpdate } from '../features/dailyUpdate/dailyUpdateThunks';

const concernOptions = ['Headache', 'Fever', 'Fatigue', 'Stress', 'Anxiety', 'Sleep Issues', 'Other'];
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const initialForm = {
  health: {
    waterIntake: '',
    exercised: false,
    sleepHours: '',
    healthConcern: false,
    concernTypes: [],
    concernDescription: '',
  },
  finance: {
    spending: '',
    boughtShares: false,
    boughtShareDetails: { stockName: '', quantity: '', amount: '' },
    soldShares: false,
    soldShareDetails: { stockName: '', quantity: '', amount: '' },
    insurancePurchased: false,
    insuranceDetails: { providerName: '', amount: '' },
  },
  career: {
    studyHours: '',
    completedCourse: false,
    appliedJobs: false,
    workedOnProject: false,
  },
  goal: {
    goalId: '',
    goalCompleted: false,
  },
};

function DailyUpdate() {
  const dispatch = useDispatch();
  const { activeGoals, completed, dailyUpdateLastSubmittedAt, error, loading, success } = useSelector((state) => state.dailyUpdate);
  const [form, setForm] = useState(initialForm);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    dispatch(fetchTodayDailyUpdate());
  }, [dispatch]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const remaining = dailyUpdateLastSubmittedAt
    ? (dailyUpdateLastSubmittedAt + COOLDOWN_MS) - currentTime
    : 0;
  const cooldownText = remaining > 0
    ? `Next update available in ${formatRemainingTime(remaining)}`
    : 'Daily update available now';

  useEffect(() => {
    if (dailyUpdateLastSubmittedAt) {
      localStorage.setItem('dailyUpdateLastSubmittedAt', String(dailyUpdateLastSubmittedAt));
    }
  }, [dailyUpdateLastSubmittedAt]);

  useEffect(() => {
    if ((completed || success) && remaining <= 0) {
      localStorage.removeItem('dailyUpdateLastSubmittedAt');
      dispatch(clearDailyUpdateCooldown());
    }
  }, [completed, dispatch, remaining, success]);

  const selectedGoal = useMemo(
    () => activeGoals.find((goal) => goal._id === form.goal.goalId),
    [activeGoals, form.goal.goalId],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    await dispatch(submitDailyUpdate(normalizeForm(form))).unwrap().catch(() => null);
    dispatch(fetchTodayDailyUpdate());
  };

  if (completed || success) {
    return (
      <div className="min-h-[calc(100vh-112px)] bg-[#05070d] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center rounded-[1.75rem] border border-[#10c7a1]/25 bg-[#0b111a]/95 p-10 text-center shadow-[0_24px_70px_-36px_rgba(0,0,0,0.9)]">
          <CheckCircle2 className="h-16 w-16 text-[#10c7a1]" />
          <h1 className="mt-5 text-3xl font-black">Today's Twin Check-In Completed</h1>
          <p className="mt-3 text-white/58">{cooldownText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-112px)] bg-[#05070d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 left-[20rem] bg-[radial-gradient(circle_at_16%_0%,rgba(16,199,161,0.12),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(123,97,255,0.12),transparent_30%)]" />
      <form onSubmit={handleSubmit} className="relative mx-auto max-w-6xl space-y-6">
        <header className="rounded-[1.75rem] border border-white/10 bg-[#080d15]/95 p-6 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7df3cc]/70">Daily Update</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Daily Twin Check-In</h1>
          <p className="mt-3 text-sm leading-6 text-white/58">Help your Digital Twin stay updated with today's activities.</p>
        </header>

        {error && <div className="rounded-2xl border border-[#ff4d7d]/30 bg-[#ff4d7d]/10 p-4 text-sm font-semibold text-[#ffb3ca]">{error}</div>}

        <Section icon={Activity} title="Health Check-In">
          <div className="grid gap-4 md:grid-cols-3">
            <NumberField label="Water today (liters)" value={form.health.waterIntake} onChange={(value) => update('health.waterIntake', value, setForm)} />
            <ToggleField label="Did you exercise today?" value={form.health.exercised} onChange={(value) => update('health.exercised', value, setForm)} />
            <NumberField label="Sleep last night (hours)" value={form.health.sleepHours} onChange={(value) => update('health.sleepHours', value, setForm)} />
          </div>
          <ToggleField label="Any health concerns today?" value={form.health.healthConcern} onChange={(value) => update('health.healthConcern', value, setForm)} />
          {form.health.healthConcern && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {concernOptions.map((option) => (
                  <label key={option} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm text-white/78">
                    <input
                      type="checkbox"
                      checked={form.health.concernTypes.includes(option)}
                      onChange={() => toggleConcern(option, setForm)}
                    />
                    {option}
                  </label>
                ))}
              </div>
              {form.health.concernTypes.includes('Other') && (
                <textarea
                  value={form.health.concernDescription}
                  onChange={(event) => update('health.concernDescription', event.target.value, setForm)}
                  placeholder="Describe your symptoms, discomfort, or concerns..."
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-[#080d15] p-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#10c7a1]/55"
                />
              )}
            </div>
          )}
        </Section>

        <Section icon={BadgeIndianRupee} title="Finance Check-In">
          <NumberField label="How much did you spend today?" value={form.finance.spending} onChange={(value) => update('finance.spending', value, setForm)} />
          <TradeBlock label="Did you buy any shares today?" enabled={form.finance.boughtShares} onToggle={(value) => update('finance.boughtShares', value, setForm)} details={form.finance.boughtShareDetails} path="finance.boughtShareDetails" setForm={setForm} />
          <TradeBlock label="Did you sell any shares today?" enabled={form.finance.soldShares} onToggle={(value) => update('finance.soldShares', value, setForm)} details={form.finance.soldShareDetails} path="finance.soldShareDetails" setForm={setForm} />
          <ToggleField label="Did you purchase any LIC or Insurance plan today?" value={form.finance.insurancePurchased} onChange={(value) => update('finance.insurancePurchased', value, setForm)} />
          {form.finance.insurancePurchased && (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Provider name" value={form.finance.insuranceDetails.providerName} onChange={(value) => update('finance.insuranceDetails.providerName', value, setForm)} />
              <NumberField label="Amount" value={form.finance.insuranceDetails.amount} onChange={(value) => update('finance.insuranceDetails.amount', value, setForm)} />
            </div>
          )}
        </Section>

        <Section icon={Briefcase} title="Career Check-In">
          <NumberField label="How many hours did you study today?" value={form.career.studyHours} onChange={(value) => update('career.studyHours', value, setForm)} />
          <div className="grid gap-4 md:grid-cols-3">
            <ToggleField label="Completed a course/module?" value={form.career.completedCourse} onChange={(value) => update('career.completedCourse', value, setForm)} />
            <ToggleField label="Applied for jobs?" value={form.career.appliedJobs} onChange={(value) => update('career.appliedJobs', value, setForm)} />
            <ToggleField label="Worked on a project?" value={form.career.workedOnProject} onChange={(value) => update('career.workedOnProject', value, setForm)} />
          </div>
        </Section>

        <Section icon={Target} title="Goal Check-In">
          {activeGoals.length > 0 ? (
            <div className="space-y-4">
              <select
                value={form.goal.goalId}
                onChange={(event) => update('goal.goalId', event.target.value, setForm)}
                className="h-12 w-full rounded-xl border border-white/10 bg-[#080d15] px-4 text-sm font-semibold text-white outline-none focus:border-[#10c7a1]/55"
              >
                <option value="">Select active goal</option>
                {activeGoals.map((goal) => <option key={goal._id} value={goal._id}>{goal.title}</option>)}
              </select>
              {selectedGoal && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <p className="text-lg font-black">{selectedGoal.title}</p>
                  <p className="mt-1 text-sm text-white/56">Progress: {selectedGoal.progress}% · Today's target: {selectedGoal.todayTarget}</p>
                </div>
              )}
              <ToggleField label="Did you complete today's goal?" value={form.goal.goalCompleted} onChange={(value) => update('goal.goalCompleted', value, setForm)} />
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-white/60">No active goals found. Create a goal to start tracking progress.</p>
          )}
        </Section>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#10c7a1]/35 bg-[#10c7a1] px-5 py-4 text-sm font-black text-[#06110f] shadow-[0_20px_50px_-25px_rgba(16,199,161,0.9)] transition hover:-translate-y-0.5 hover:bg-[#7df3cc] disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Submit Daily Twin Check-In
        </button>
      </form>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-[#0b111a]/92 p-5 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.9)] sm:p-6">
      <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-[#7df3cc]">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-2xl font-black">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function NumberField({ label, value, onChange }) {
  return <Field label={label} type="number" value={value} onChange={onChange} />;
}

function TextField({ label, value, onChange }) {
  return <Field label={label} type="text" value={value} onChange={onChange} />;
}

function Field({ label, type, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/40">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-[#080d15] px-4 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-[#10c7a1]/55"
      />
    </label>
  );
}

function ToggleField({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <span className="text-sm font-bold text-white/82">{label}</span>
      <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
        {[true, false].map((option) => (
          <button
            type="button"
            key={String(option)}
            onClick={() => onChange(option)}
            className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${value === option ? 'bg-[#10c7a1] text-[#06110f]' : 'text-white/45 hover:text-white'}`}
          >
            {option ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );
}

function TradeBlock({ label, enabled, onToggle, details, path, setForm }) {
  return (
    <div className="space-y-4">
      <ToggleField label={label} value={enabled} onChange={onToggle} />
      {enabled && (
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="Stock name" value={details.stockName} onChange={(value) => update(`${path}.stockName`, value, setForm)} />
          <NumberField label="Quantity" value={details.quantity} onChange={(value) => update(`${path}.quantity`, value, setForm)} />
          <NumberField label="Amount" value={details.amount} onChange={(value) => update(`${path}.amount`, value, setForm)} />
        </div>
      )}
    </div>
  );
}

function update(path, value, setForm) {
  setForm((current) => {
    const next = structuredClone(current);
    const keys = path.split('.');
    let pointer = next;
    keys.slice(0, -1).forEach((key) => { pointer = pointer[key]; });
    pointer[keys.at(-1)] = value;
    return next;
  });
}

function toggleConcern(option, setForm) {
  setForm((current) => {
    const exists = current.health.concernTypes.includes(option);
    return {
      ...current,
      health: {
        ...current.health,
        concernTypes: exists
          ? current.health.concernTypes.filter((item) => item !== option)
          : [...current.health.concernTypes, option],
      },
    };
  });
}

function normalizeForm(form) {
  return {
    ...form,
    health: {
      ...form.health,
      waterIntake: Number(form.health.waterIntake || 0),
      sleepHours: Number(form.health.sleepHours || 0),
    },
    finance: {
      ...form.finance,
      spending: Number(form.finance.spending || 0),
      boughtShareDetails: numericTrade(form.finance.boughtShareDetails),
      soldShareDetails: numericTrade(form.finance.soldShareDetails),
      insuranceDetails: {
        ...form.finance.insuranceDetails,
        amount: Number(form.finance.insuranceDetails.amount || 0),
      },
    },
    career: {
      ...form.career,
      studyHours: Number(form.career.studyHours || 0),
    },
  };
}

function numericTrade(value) {
  return {
    ...value,
    quantity: Number(value.quantity || 0),
    amount: Number(value.amount || 0),
  };
}

function formatRemainingTime(remaining) {
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor(
    (remaining % (1000 * 60 * 60)) / (1000 * 60),
  );
  const seconds = Math.floor(
    (remaining % (1000 * 60)) / 1000,
  );

  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
}

export default DailyUpdate;
