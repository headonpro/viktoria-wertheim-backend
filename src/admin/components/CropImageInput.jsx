// @ts-nocheck
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

const CropImageInput = ({ value = {}, onChange, name }) => {
  const [crop, setCrop] = useState(value.crop || { x: 0, y: 0 });
  const [zoom, setZoom] = useState(value.zoom || 1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(value.croppedAreaPixels || null);

  // Bild-URL aus value.imageUrl oder leer
  const imageUrl = value.imageUrl;

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
    onChange({ target: { name, value: { ...value, crop, zoom, croppedAreaPixels } } });
  }, [crop, zoom, name, onChange, value]);

  if (!imageUrl) {
    return (
      <div style={{ color: 'red', padding: 16 }}>
        <b>Kein Bild ausgewählt.</b>
        <br />
        Bitte gib im JSON-Feld <code>imageUrl</code> die URL eines Bildes aus der Medienbibliothek an.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: 300, height: 200, background: '#333' }}>
      <Cropper
        image={imageUrl}
        crop={crop}
        zoom={zoom}
        aspect={3 / 2}
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onCropComplete={onCropComplete}
      />
      <div style={{ marginTop: 10 }}>
        <label>Zoom: </label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
        />
      </div>
    </div>
  );
};

export default CropImageInput;