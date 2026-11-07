import { useState } from 'react';
import { CHARACTERS } from './characters.js';
import { isBackgroundActive, normalizePreferences } from './preferences.js';

function Artwork({ character }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img className="tt-character-art" src={character.src} alt="" draggable="false"
    decoding="async" onError={() => setFailed(true)} />;
}

export function CharacterBackground({ preferences, isDarkMode }) {
  const settings = normalizePreferences(preferences);
  if (!isBackgroundActive(settings, isDarkMode)) return null;
  const character = CHARACTERS.find((item) => item.id === settings.character);
  return (
    <div className={`tt-character-background tt-character-background--${settings.layout}`}
      data-character={character.id} aria-hidden="true"
      style={{ '--tt-character-opacity': settings.opacity / 100 }}>
      <Artwork key={character.id} character={character} />
      <div className="tt-character-shade" />
    </div>
  );
}
