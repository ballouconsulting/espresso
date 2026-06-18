"use client";

import { useMemo, useState } from "react";
import { DialInAdvisor } from "./components/DialInAdvisor.tsx";
import {
  ShotCalculator,
  type TargetRecipe,
} from "./components/ShotCalculator.tsx";
import { TemperatureGuide } from "./components/TemperatureGuide.tsx";

const steps = [
  {
    number: "01",
    title: "Weigh your dose",
    text: "Start with a dose that fits your basket. Keep it fixed while dialing in so you only change one variable at a time.",
    note: "Start here: 18.0g",
  },
  {
    number: "02",
    title: "Distribute evenly",
    text: "Break up clumps and level the bed before tamping. Even density helps water travel through the puck evenly.",
    note: "A thin needle tool helps",
  },
  {
    number: "03",
    title: "Tamp level",
    text: "Press firmly and, more importantly, level. Consistency matters more than chasing an exact tamp pressure.",
    note: "Level beats harder",
  },
  {
    number: "04",
    title: "Pull by weight",
    text: "Place the cup on a scale and stop at your target yield. Time is a useful clue, but taste makes the decision.",
    note: "Aim for 36g out",
  },
];

const fixes = [
  {
    taste: "Sour & thin",
    detail: "The shot is likely under-extracted.",
    actions: ["Grind finer", "Increase yield slightly", "Use hotter water"],
    color: "lime",
  },
  {
    taste: "Bitter & dry",
    detail: "The shot is likely over-extracted.",
    actions: ["Grind coarser", "Decrease yield slightly", "Use cooler water"],
    color: "coral",
  },
  {
    taste: "Both at once",
    detail: "Uneven extraction is the likely culprit.",
    actions: ["Improve distribution", "Check for channeling", "Tamp level"],
    color: "blue",
  },
];

export default function Home() {
  const [targetRecipe, setTargetRecipe] = useState<TargetRecipe>({
    dose: 18,
    ratio: 2,
    yieldGrams: 36,
    ratioLabel: "1:2",
  });
  const [checked, setChecked] = useState<number[]>([]);

  const yieldWeight = useMemo(
    () => targetRecipe.yieldGrams.toFixed(1),
    [targetRecipe.yieldGrams],
  );

  const toggleStep = (index: number) => {
    setChecked((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    );
  };

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top" aria-label="Espresso Field Guide home">
          <CoffeeMark />
          <span>Field Guide</span>
        </a>
        <div className="nav-links">
          <a href="#method">Method</a>
          <a href="#dial-in">Dial in</a>
          <a href="#advisor">Advisor</a>
          <a href="#temperature">Temp</a>
        </div>
        <a className="nav-cta" href="#recipe">
          Quick recipe <Arrow />
        </a>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">A practical home-barista manual</p>
          <h1>
            Better espresso,
            <br />
            <em>on repeat.</em>
          </h1>
          <p className="hero-intro">
            Good espresso is not magic. It is a handful of variables, measured
            carefully and adjusted one at a time.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#method">
              Learn the method <Arrow />
            </a>
            <a className="text-link" href="#dial-in">
              Dial in a shot
            </a>
          </div>
        </div>

        <div className="hero-art" aria-label="Illustration of espresso brewing">
          <div className="art-note note-one">
            <span>dose</span>
            <strong>{targetRecipe.dose.toFixed(1)}g</strong>
          </div>
          <div className="art-note note-two">
            <span>yield</span>
            <strong>{yieldWeight}g</strong>
          </div>
          <div className="sun" />
          <div className="machine">
            <div className="machine-top">
              <div className="gauge">
                <span />
              </div>
              <div className="machine-lines">
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="group-head" />
            <div className="portafilter" />
            <div className="espresso-stream" />
            <div className="cup">
              <div className="coffee" />
              <div className="cup-handle" />
            </div>
            <div className="scale" />
          </div>
          <div className="bean bean-one" />
          <div className="bean bean-two" />
          <div className="bean bean-three" />
        </div>

        <div className="hero-stats">
          <div>
            <span>Start with</span>
            <strong>{targetRecipe.ratioLabel}</strong>
            <small>brew ratio</small>
          </div>
          <div>
            <span>Aim around</span>
            <strong>25–35s</strong>
            <small>then follow taste</small>
          </div>
          <div>
            <span>Change</span>
            <strong>one thing</strong>
            <small>between shots</small>
          </div>
        </div>
      </section>

      <section className="method section shell" id="method">
        <SectionHeading
          kicker="The repeatable method"
          title="Control the variables."
          intro="Consistency starts before the pump turns on. Build a routine you can repeat, then use taste to make deliberate adjustments."
        />
        <div className="steps-grid">
          {steps.map((step, index) => (
            <button
              className={`step-card ${checked.includes(index) ? "done" : ""}`}
              key={step.number}
              onClick={() => toggleStep(index)}
            >
              <span className="step-number">{step.number}</span>
              <span className="check">{checked.includes(index) ? "✓" : ""}</span>
              <strong>{step.title}</strong>
              <span className="step-text">{step.text}</span>
              <span className="step-note">{step.note}</span>
            </button>
          ))}
        </div>
        <p className="tap-note">Tap each card as you complete your workflow.</p>
      </section>

      <section className="dial-section" id="dial-in">
        <div className="shell dial-grid">
          <div className="dial-copy">
            <p className="eyebrow light">The starting recipe</p>
            <h2>Set a target.<br /><em>Then taste.</em></h2>
            <p>
              A 1:2 ratio is a useful starting point, not a law. Lighter roasts
              often taste better with a longer ratio; darker roasts often need
              less.
            </p>
            <div className="taste-rule">
              <span>Remember</span>
              <strong>Time diagnoses. Taste decides.</strong>
            </div>
          </div>

          <ShotCalculator
            onCalculated={setTargetRecipe}
            recipe={targetRecipe}
          />
        </div>
      </section>

      <DialInAdvisor targetRecipe={targetRecipe} />

      <TemperatureGuide />

      <section className="section shell" id="troubleshoot">
        <SectionHeading
          kicker="Taste, then adjust"
          title="Fix the next shot."
          intro="Taste gives you direction. Keep the dose fixed, pick one adjustment, and pull again."
        />
        <div className="fix-grid">
          {fixes.map((fix) => (
            <article className={`fix-card ${fix.color}`} key={fix.taste}>
              <div className="flavor-orbit"><span /></div>
              <p className="fix-label">If it tastes</p>
              <h3>{fix.taste}</h3>
              <p>{fix.detail}</p>
              <ul>
                {fix.actions.map((action) => <li key={action}>{action}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="recipe-section" id="recipe">
        <div className="shell recipe-grid">
          <div>
            <p className="eyebrow">The fridge-door version</p>
            <h2>A reliable<br /><em>morning recipe.</em></h2>
          </div>
          <ol className="recipe-list">
            <li><span>01</span><p><strong>Warm everything</strong>Let the machine, portafilter, and cup get properly hot.</p></li>
            <li><span>02</span><p><strong>Weigh {targetRecipe.dose.toFixed(1)}g</strong>Grind fresh, distribute evenly, and tamp level.</p></li>
            <li><span>03</span><p><strong>Pull {yieldWeight}g out</strong>Use 25–35 seconds as your initial reference window.</p></li>
            <li><span>04</span><p><strong>Taste and log</strong>Adjust the grind first. Change only one variable.</p></li>
          </ol>
        </div>
      </section>

      <section className="sources shell">
        <div>
          <p className="eyebrow">Go deeper</p>
          <h2>Learn from the people<br />who taught us.</h2>
        </div>
        <div className="source-links">
          <a href="https://www.youtube.com/playlist?list=PLxz0FjZMVOl3MuAzK5l3gjakoOGrmK8fP" target="_blank" rel="noreferrer">
            <span>Start here</span><strong>Understanding Espresso</strong><Arrow />
          </a>
          <a href="https://www.youtube.com/watch?v=MbTD42FvMVU" target="_blank" rel="noreferrer">
            <span>Practical guide</span><strong>Fixing Bad Espresso</strong><Arrow />
          </a>
          <a href="https://www.youtube.com/watch?v=I6ti6NMCqsc" target="_blank" rel="noreferrer">
            <span>Deep dive</span><strong>Lance&apos;s Espresso Tutorial</strong><Arrow />
          </a>
        </div>
      </section>

      <footer>
        <div className="shell footer-inner">
          <div className="brand"><CoffeeMark /><span>Field Guide</span></div>
          <p>Make notes. Change one thing. Drink the experiments.</p>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </main>
  );
}

function SectionHeading({
  kicker,
  title,
  intro,
}: {
  kicker: string;
  title: string;
  intro: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h2>{title}</h2>
      </div>
      <p>{intro}</p>
    </div>
  );
}

function CoffeeMark() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 4C11 4 6 12 6 20s5 16 14 16 14-8 14-16S29 4 20 4Z" />
      <path d="M25 6c-7 6-4 13-10 17-3 2-5 6-4 9" />
    </svg>
  );
}

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
