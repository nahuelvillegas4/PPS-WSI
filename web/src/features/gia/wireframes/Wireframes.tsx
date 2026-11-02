import './wireframes.css';
import {
  WIREFRAMES,
  WIREFRAME_BANNER,
  WIREFRAME_LEGEND,
  formatSourceTag,
  regionsIn,
  type WireArea,
  type WireElement,
  type WireframeSpec,
} from './wireframeSpec';

export interface WireframeProps {
  id: 'editor' | 'import' | 'export' | 'classes';
}

/** One sketched element: its label, the sketch of the control and the tag with its source. */
function WireElementBox({ element }: { element: WireElement }) {
  const { kind, items } = element;
  return (
    <div className="gia-wf-el" data-kind={kind}>
      <div className="gia-wf-el-head">
        {kind === 'checkbox' ? <span className="gia-wf-check" aria-hidden="true" /> : null}
        <span className="gia-wf-el-label">{element.label}</span>
        <span className="gia-wf-tag" data-source={element.source.kind}>
          {formatSourceTag(element.source)}
        </span>
      </div>
      {kind === 'field' ? <span className="gia-wf-input" aria-hidden="true" /> : null}
      {items ? (
        <ul className="gia-wf-items">
          {items.map((item) => (
            <li
              key={item.label}
              className="gia-wf-item"
              data-disabled={item.disabled ? 'true' : 'false'}
            >
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Regions({ spec, area }: { spec: WireframeSpec; area: WireArea }) {
  return regionsIn(spec, area).map((region) => (
    <div key={region.id} className="gia-wf-region" data-area={area}>
      {region.elements.map((element) => (
        <WireElementBox key={element.id} element={element} />
      ))}
    </div>
  ));
}

/** A proposed screen drawn with plain boxes. It is a sketch: it takes no input and calls nothing. */
export function Wireframe({ id }: WireframeProps) {
  const spec = WIREFRAMES[id];
  const hasBody = regionsIn(spec, 'main').length + regionsIn(spec, 'side').length > 0;
  return (
    <section className="gia-wf" data-wireframe={id} aria-label={spec.title}>
      <p className="gia-wf-banner" role="note">
        {WIREFRAME_BANNER}
      </p>
      <h4 className="gia-wf-title">{spec.title}</h4>
      <p className="gia-wf-caption">{spec.caption}</p>
      <div className="gia-wf-frame">
        <Regions spec={spec} area="top" />
        {hasBody ? (
          <div className="gia-wf-body">
            <Regions spec={spec} area="main" />
            <Regions spec={spec} area="side" />
          </div>
        ) : null}
        <Regions spec={spec} area="bottom" />
      </div>
      <p className="gia-wf-legend">{WIREFRAME_LEGEND}</p>
    </section>
  );
}
