import type { StepDef } from '../model/types';
import { StatusChip } from './StatusChip';

/** The product flow as numbered cards, each with the status of its API and its web screen. */
export function Stepper({ steps }: { steps: readonly StepDef[] }) {
  return (
    <ol className="gia-stepper">
      {steps.map((step, index) => (
        <li key={step.id} className="gia-step">
          <span className="gia-step-n" aria-hidden="true">
            {index + 1}
          </span>
          <h3 className="gia-step-title">{step.title}</h3>
          <div className="gia-step-chips">
            <StatusChip status={step.api} prefix="API" compact />
            <StatusChip status={step.web} prefix="Web" compact />
          </div>
          {step.note && <p className="gia-step-note">{step.note}</p>}
        </li>
      ))}
    </ol>
  );
}
