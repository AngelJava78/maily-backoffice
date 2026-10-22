import { describe, expect, it } from 'vitest';

import { colorTokens } from './tokens';

describe('colorTokens', () => {
  it('matches, token by token, the values web-soft uses (research.md §3)', () => {
    expect(colorTokens).toEqual({
      marca: '#C9A227',
      marcaOscuro: '#A8871F',
      marcaTinte: '#FBF3D9',
      marcaBorde: '#EBD9A0',
      accion: '#1A3D63',
      accionHover: '#0A1931',
      accionTinte: '#EEF4FA',
      accionBorde: '#B3CFE5',
      tinta: '#0A1931',
      cuerpo: '#22303F',
      suave: '#4A5567',
      tenue: '#5F6B7D',
      fondo: '#F6FAFD',
      superficie: '#FFFFFF',
      superficieSutil: '#F1F6FB',
      borde: '#E3EAF2',
      bordeFuerte: '#4A7FA7',
      exito: '#1F6E47',
      exitoTinte: '#E7F6EE',
      exitoBorde: '#B7E0C9',
      aviso: '#856404',
      avisoIcono: '#B8860B',
      avisoTinte: '#FEF6E0',
      avisoBorde: '#F0D48A',
      peligro: '#B3261E',
      peligroHover: '#8C1D18',
      peligroTinte: '#F9DEDC',
      peligroBorde: '#F1B9B4',
    });
  });

  it('uses bordeFuerte (not the literal borde) as the field-border token, to meet WCAG AA (FR-005 vs FR-019)', () => {
    expect(colorTokens.bordeFuerte).toBe('#4A7FA7');
    expect(colorTokens.bordeFuerte).not.toBe(colorTokens.borde);
  });
});
