'use client';
import { useEffect, useRef, useState } from 'react';
import type { Map as MapInstance, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { LocateFixed, Minus, Plus } from 'lucide-react';
import { CATEGORIES, type EventRecord } from '@/lib/types';
export default function EventMap({
  events,
  onSelect,
  selectedId,
}: {
  events: EventRecord[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<MapInstance | null>(null),
    latest = useRef({ events, onSelect });
  latest.current = { events, onSelect };
  const [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    import('maplibre-gl')
      .then((lib) => {
        if (disposed || !container.current) return;
        lib.setWorkerUrl(mapWorkerUrl);
        const m = new lib.Map({
          container: container.current,
          style: 'https://tiles.openfreemap.org/styles/dark',
          center: [43, 30.5],
          zoom: 3.6,
          minZoom: 1.4,
          maxZoom: 12,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.current = m;
        resizeObserver = new ResizeObserver(() => m.resize());
        resizeObserver.observe(container.current);
        m.on('load', () => {
          m.addSource('events', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
            cluster: true,
            clusterMaxZoom: 8,
            clusterRadius: 32,
          });
          m.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'events',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#d7ae62',
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                15,
                10,
                21,
                40,
                27,
              ],
              'circle-stroke-color': '#e9cd9233',
              'circle-stroke-width': 7,
            },
          });
          m.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'events',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': ['get', 'point_count_abbreviated'],
              'text-size': 13,
            },
            paint: { 'text-color': '#09121d' },
          });
          m.addLayer({
            id: 'event-halo',
            type: 'circle',
            source: 'events',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': ['get', 'color'],
              'circle-radius': 14,
              'circle-opacity': 0.13,
            },
          });
          m.addLayer({
            id: 'event-points',
            type: 'circle',
            source: 'events',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': ['get', 'color'],
              'circle-radius': 5.5,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#08111d',
            },
          });
          m.on('click', 'event-points', (e) => {
            const id = e.features?.[0]?.properties?.id;
            if (id) latest.current.onSelect(String(id));
          });
          m.on('click', 'clusters', async (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const z = await (
              m.getSource('events') as GeoJSONSource
            ).getClusterExpansionZoom(Number(f.properties?.cluster_id));
            if (f.geometry.type === 'Point')
              m.easeTo({
                center: f.geometry.coordinates as [number, number],
                zoom: z,
              });
          });
          for (const layer of ['event-points', 'clusters']) {
            m.on('mouseenter', layer, () => {
              m.getCanvas().style.cursor = 'pointer';
            });
            m.on('mouseleave', layer, () => {
              m.getCanvas().style.cursor = '';
            });
          }
          setReady(true);
        });
        m.on('error', () => setError(true));
      })
      .catch(() => setError(true));
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    const src = map.current.getSource('events') as GeoJSONSource;
    src?.setData({
      type: 'FeatureCollection',
      features: events
        .filter(
          (e) => e.lat !== null && e.lon !== null && e.precision !== 'country',
        )
        .map((e) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [e.lon!, e.lat!] },
          properties: {
            id: e.id,
            color: CATEGORIES[e.category]?.color ?? '#aaa',
          },
        })),
    });
  }, [ready, events]);
  useEffect(() => {
    const e = events.find((e) => e.id === selectedId);
    if (ready && e?.lat != null && e.lon != null)
      map.current?.easeTo({
        center: [e.lon, e.lat],
        zoom: Math.max(map.current.getZoom(), 5.5),
      });
  }, [selectedId, ready, events]);
  return (
    <div className="map-surface">
      <div
        ref={container}
        className="map-canvas"
        aria-label="Ortadoğu olay haritası"
      />
      <div className="map-heading">
        <span className="eyebrow">BÖLGESEL GÖRÜNÜM</span>
        <h1>Ortadoğu</h1>
        <p>Gelişmelerin coğrafyası</p>
      </div>
      <div className="map-tools">
        <button aria-label="Yakınlaştır" onClick={() => map.current?.zoomIn()}>
          <Plus size={18} />
        </button>
        <button aria-label="Uzaklaştır" onClick={() => map.current?.zoomOut()}>
          <Minus size={18} />
        </button>
        <button
          aria-label="Ortadoğu’ya dön"
          onClick={() => map.current?.easeTo({ center: [43, 30.5], zoom: 3.6 })}
        >
          <LocateFixed size={18} />
        </button>
      </div>
      <div className="map-caption">
        <span className="crosshair">+</span>
        {
          events.filter((e) => e.lat !== null && e.precision !== 'country')
            .length
        }{' '}
        konumlu olay
        <span className="caption-divider" />
        Şehir işaretleri yaklaşık konumu gösterir
      </div>
      {error && !ready && (
        <p className="map-error">
          Harita yüklenemedi. Olayları haber akışından inceleyebilirsiniz.
        </p>
      )}
    </div>
  );
}
