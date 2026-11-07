import { useId } from 'react';
import { CHARACTERS } from './characters.js';

export function CharacterBackgroundSettings({ preferences, onChange, isDarkMode, onEnableDarkMode, storageFailed = false }) {
  const id = useId();
  return (
    <section className="tt-character-settings" aria-labelledby={`${id}-title`}>
      <div className="tt-character-settings-heading">
        <div>
          <h4 id={`${id}-title`}>Character background</h4>
          <p>A little inspiration behind your everyday progress.</p>
        </div>
        <button type="button" role="switch" aria-checked={preferences.enabled}
          aria-label="Character background" className="tt-character-switch"
          onClick={() => onChange({ enabled: !preferences.enabled })}>
          <span />
        </button>
      </div>

      <fieldset className="tt-character-fieldset">
        <legend>Choose your character</legend>
        <div className="tt-character-options">
          {CHARACTERS.map((character) => (
            <button key={character.id} type="button" className="tt-character-option"
              aria-label={`Choose ${character.name}`} aria-pressed={preferences.character === character.id}
              onClick={() => onChange({ character: character.id })}
              style={{ '--tt-option-accent': character.color }}>
              <span className="tt-character-thumbnail"><img src={character.src} alt="" loading="lazy" draggable="false" /></span>
              <span>{character.name}</span>
              {preferences.character === character.id && <span className="tt-character-selected" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="tt-character-fieldset">
        <legend>Placement</legend>
        <div className="tt-character-layouts">
          <button type="button" aria-pressed={preferences.layout === 'half'} onClick={() => onChange({ layout: 'half' })}>
            <span className="tt-character-layout-icon tt-character-layout-icon--half" aria-hidden="true" />Half page
          </button>
          <button type="button" aria-pressed={preferences.layout === 'full'} onClick={() => onChange({ layout: 'full' })}>
            <span className="tt-character-layout-icon" aria-hidden="true" />Full page
          </button>
        </div>
        <p className="tt-character-hint">{preferences.layout === 'full'
          ? 'Artwork fits the screen, with its original crop preserved.'
          : 'A smaller character, placed in the lower half of the screen.'}</p>
      </fieldset>

      <div className="tt-character-visibility">
        <label htmlFor={`${id}-opacity`}>Visibility <output htmlFor={`${id}-opacity`}>{preferences.opacity}%</output></label>
        <input id={`${id}-opacity`} type="range" min="10" max="50" step="1" value={preferences.opacity}
          onChange={(event) => onChange({ opacity: Number(event.target.value) })} />
        <div className="tt-character-range-labels" aria-hidden="true"><span>Subtle</span><span>Bold</span></div>
      </div>

      <div className="tt-character-status" role="status">
        {!preferences.enabled ? 'Background is off. Your choices are saved for next time.'
          : isDarkMode ? 'Active in dark mode. Visible across your app pages.'
            : 'Ready for dark mode. Hidden while light mode is active.'}
      </div>
      {!isDarkMode && preferences.enabled && onEnableDarkMode && (
        <button type="button" className="tt-character-dark-button" onClick={onEnableDarkMode}>Switch to dark mode</button>
      )}
      {storageFailed && <p className="tt-character-save-error" role="status">Your choices work now, but could not be saved on this device.</p>}
    </section>
  );
}
