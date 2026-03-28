'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { LabMeasurementPoint } from '../../../types/lab';

export function LabTemperatureChart({ series }: { series: LabMeasurementPoint[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const width = 720;
    const height = 220;
    const margin = { top: 20, right: 18, bottom: 28, left: 44 };

    const data = series.length > 1 ? series : [{ t: 0, temperatureC: 22, ph: 7 }, ...(series || [])];

    const x = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.t) as [number, number])
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([
        d3.min(data, (d) => d.temperatureC)! - 2,
        d3.max(data, (d) => d.temperatureC)! + 2
      ])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const line = d3
      .line<LabMeasurementPoint>()
      .x((d) => x(d.t))
      .y((d) => y(d.temperatureC))
      .curve(d3.curveMonotoneX);

    const root = d3.select(svg);
    root.attr('viewBox', `0 0 ${width} ${height}`);

    root.selectAll('*').remove();

    root
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)
      .attr('rx', 22)
      .attr('fill', '#0f172a')
      .attr('opacity', 0.04);

    root
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((d) => `${d}s`))
      .call((g) => g.selectAll('text').attr('fill', '#475569'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#cbd5e1'));

    root
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}°`))
      .call((g) => g.selectAll('text').attr('fill', '#475569'))
      .call((g) => g.selectAll('path,line').attr('stroke', '#cbd5e1'));

    root
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#0ea5e9')
      .attr('stroke-width', 3)
      .attr('d', line as any);

    const last = data[data.length - 1];

    root
      .append('circle')
      .attr('cx', x(last.t))
      .attr('cy', y(last.temperatureC))
      .attr('r', 5)
      .attr('fill', '#0284c7');

    root
      .append('text')
      .attr('x', width - margin.right)
      .attr('y', margin.top)
      .attr('text-anchor', 'end')
      .attr('fill', '#334155')
      .attr('font-size', 12)
      .text('Temperature (°C)');
  }, [series]);

  return <svg ref={svgRef} className="h-[240px] w-full" />;
}
