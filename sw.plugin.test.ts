import { describe, expect, it } from 'vitest'
import { precacheUrls } from './sw.plugin.ts'

describe('precacheUrls', () => {
  it('lists every app file after "/", sorted, and skips files the app never needs offline', () => {
    const files = [
      'assets/PendulumScene-abc123.js',
      'index.html',
      'assets/index-def456.css',
      'sw.js',
      '_headers',
      '_redirects',
      'assets/index-def456.js.map',
      'og/pendulum.png',
      'screenshots/home-narrow.jpg',
      'robots.txt',
      'sitemap.xml',
      'manifest.json',
      'icons/icon-192.png',
    ].map((path) => ({ path, bytes: 1 }))
    expect(precacheUrls(files)).toEqual([
      '/',
      '/assets/PendulumScene-abc123.js',
      '/assets/index-def456.css',
      '/icons/icon-192.png',
      '/index.html',
      '/manifest.json',
    ])
  })
})
