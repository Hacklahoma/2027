import { useId, useState } from 'react';
import { Lines } from './Lines.jsx';

// The first four questions are the Figma's; the rest come from the 2026 FAQ.
// TODO: confirm the 2026 answers still hold for 2027 (cost, age, travel, team size).
const QA = [
  ['What is Hacklahoma?', 'A student hackathon at the University of Oklahoma, bringing curious people together to imagine, learn, and build.'],
  ['When and where is it?', 'February 6–7, 2027, at the University of Oklahoma in Norman. Get event updates and we’ll send registration details as soon as they’re ready.'],
  ['Do I need coding experience?', 'You don’t need to have it all figured out. Beginners, designers, makers, and experienced hackers all have something to bring.'],
  ['Do I need a team or an idea?', 'Come with friends or come ready to meet new people. A conversation is often where the best ideas begin. Teams can have up to four people.'],
  ['How much does it cost?', 'Nothing. Hacklahoma is free for students, and meals are provided throughout the event.'],
  ['Who can attend?', 'Students who are 18 or older. If you’re curious and ready to build, you belong here.'],
  ['Can I work on something I’ve already started?', 'Projects should be new, built from scratch during the event. Bring ideas, sketches, and inspiration, just not finished code.'],
  ['Can I leave and come back?', 'Yes. You’re welcome to come and go during the event.'],
  ['Do you reimburse travel?', 'We aren’t able to offer travel reimbursement.'],
];

function Item({ q, a, open, onToggle, i }) {
  const id = useId();
  return (
    <li className={`qa${open ? ' open' : ''}`} style={{ '--i': i }}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle}>
          {q}
          <span className="plus" aria-hidden="true" />
        </button>
      </h3>
      <div className="answer" id={id} role="region">
        <div><p>{a}</p></div>
      </div>
    </li>
  );
}

export default function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="faq wrap" id="faq" data-route="L">
      <div className="faq-head" data-reveal>
        <p className="eyebrow fade">A few things to know</p>
        <Lines lines={['A little guidance', 'before you set sail.']} />
        <p className="faq-note fade" style={{ '--d': '.45s' }}>No perfect idea required.<br />Just a little curiosity.</p>
      </div>
      <ul className="qas" data-reveal>
        {QA.map(([q, a], i) => (
          <Item key={q} q={q} a={a} i={i} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
        ))}
        <li className="qa-coc" style={{ '--i': QA.length }}>
          Everyone at Hacklahoma follows the{' '}
          <a href="https://mlh.io/code-of-conduct" target="_blank" rel="noopener">MLH Code of Conduct</a>.
          Anything else? Write to <a href="mailto:hacklahoma@ou.edu">hacklahoma@ou.edu</a>.
        </li>
      </ul>
    </section>
  );
}
