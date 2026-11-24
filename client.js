/* global TrelloPowerUp, JSZip */

const BILD_ENDUNGEN = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

function istBild(anhang) {
  const name = (anhang.name || '').toLowerCase();
  const mime = (anhang.mimeType || '').toLowerCase();
  return mime.startsWith('image/') || BILD_ENDUNGEN.some(endung => name.endsWith(endung));
}

async function bilderAlsZipLaden(t) {
  const karte = await t.card('name', 'attachments');
  const bilder = (karte.attachments || []).filter(istBild);

  if (bilder.length === 0) {
    return t.alert({
      message: 'Keine Bilder in dieser Karte gefunden.',
      duration: 4,
      display: 'warning'
    });
  }

  t.alert({
    message: `Lade ${bilder.length} Bilder herunter und erstelle ZIP...`,
    duration: 6,
    display: 'info'
  });

  const zip = new JSZip();
  let erfolgreich = 0;

  for (let i = 0; i < bilder.length; i++) {
    const bild = bilder[i];
    try {
      const response = await fetch(bild.url);
      if (!response.ok) throw new Error('Download fehlgeschlagen');
      
      const blob = await response.blob();
      const saubererName = `${String(i + 1).padStart(2, '0')}_${bild.name.replace(/[\\/*?:"<>|]/g, '_')}`;
      zip.file(saubererName, blob);
      erfolgreich++;
    } catch (err) {
      console.error('Fehler bei Bild:', bild.name, err);
    }
  }

  if (erfolgreich === 0) {
    return t.alert({
      message: 'Fehler: Trello hat den direkten Zugriff blockiert (CORS/Auth).',
      duration: 6,
      display: 'error'
    });
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(zipBlob);
  
  const link = document.createElement('a');
  link.href = downloadUrl;
  const kartenNameSauber = karte.name.replace(/[\\/*?:"<>|]/g, '_').substring(0, 40);
  link.download = `${kartenNameSauber}_Bilder.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);

  t.alert({
    message: `Fertig! ${erfolgreich} Bilder als ZIP gespeichert.`,
    duration: 5,
    display: 'success'
  });
}

TrelloPowerUp.initialize({
  'card-buttons': function(t) {
    return [{
      icon: 'https://flaticon.com',
      text: 'Alle Bilder (ZIP)',
      callback: bilderAlsZipLaden
    }];
  }
});
