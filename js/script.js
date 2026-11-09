/** @typedef {{region: string, year: number, sec_f: number, sec_m: number}} EnrollmentRow */
/** @typedef {{year: number, v: number}} GapRow */

const W = 600,
    H = 320,
    M = { top: 50, right: 20, bottom: 45, left: 60 };

function svgFor(id, w = W, h = H) {
    return d3.select(id).append("svg").attr("width", w).attr("height", h);
}

function axes(svg, xAxis, y, h) {
    svg.append("g")
        .attr("transform", `translate(0,${h - M.bottom})`)
        .call(xAxis);
    svg.append("g")
        .attr("transform", `translate(${M.left},0)`)
        .call(d3.axisLeft(y));
}

function axisLabels(svg, w, h, xText, yText) {
    svg.append("text")
        .attr("x", (M.left + w - M.right) / 2)
        .attr("y", h - 8)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .text(xText);
    svg.append("text")
        .attr(
            "transform",
            `translate(16,${(M.top + h - M.bottom) / 2}) rotate(-90)`,
        )
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .text(yText);
}

function title(svg, text) {
    svg.append("text")
        .attr("x", M.left)
        .attr("y", 20)
        .attr("font-weight", "bold")
        .text(text);
}

d3.csv("data/gender_subset.csv", (row) => {
    const region = row.region;
    const year = Number(row.year);
    const sec_f = Number(row.sec_f);
    const sec_m = Number(row.sec_m);
    if (!region || !row.sec_f || !row.sec_m || !Number.isInteger(year) || !Number.isFinite(sec_f) || !Number.isFinite(sec_m)) {
        throw new Error("Enrollment data contains an invalid row");
    }
    return { region, year, sec_f, sec_m };
}).then((data) => {
    const ssa = data.filter((d) => d.region === "Sub-Saharan Africa");

    {
        const w = 340,
            h = 440;
        const rows = ssa
            .filter((d) => d.year >= 1996 && d.year <= 2009)
            .map((d) => ({ year: d.year, v: d.sec_m - d.sec_f }));
        const svg = svgFor("#black-hat-opt-1", w, h);
        const x = d3
            .scaleLinear()
            .domain(d3.extent(rows, (d) => d.year))
            .range([M.left, w - M.right]);
        const y = d3
            .scaleLinear()
            .domain(d3.extent(rows, (d) => d.v))
            .range([h - M.bottom, M.top]);
        axes(
            svg,
            d3.axisBottom(x).ticks(4).tickFormat(d3.format("d")),
            y,
            h,
        );
        axisLabels(svg, w, h, "Year", "Enrollment gap (percentage points)");
        const gapLine = /** @type {d3.Line<GapRow>} */ (d3.line());
        svg.append("path")
            .datum(rows)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 3)
            .attr(
                "d",
                gapLine
                    .x((d) => x(d.year))
                    .y((d) => y(d.v))
                    .curve(d3.curveBasis),
            );
        title(svg, "Is anyone closing the gap?");
        svg.append("text")
            .attr("x", M.left)
            .attr("y", 36)
            .attr("font-size", 11)
            .text("Girls' secondary enrollment gap, Sub-Saharan Africa");
    }

    {
        const keys = ["sec_f", "sec_m"];
        const color = { sec_f: "darkorange", sec_m: "steelblue" };
        const svg = svgFor("#white-hat-opt-1");
        const x = d3
            .scaleLinear()
            .domain(d3.extent(ssa, (d) => d.year))
            .range([M.left, W - M.right]);
        const y = d3
            .scaleLinear()
            .domain([0, 50])
            .range([H - M.bottom, M.top]);
        axes(svg, d3.axisBottom(x).tickFormat(d3.format("d")), y, H);
        axisLabels(svg, W, H, "Year", "Secondary enrollment (% gross)");
        keys.forEach((k) => {
            const enrollmentLine = /** @type {d3.Line<EnrollmentRow>} */ (d3.line());
            svg.append("path")
                .datum(ssa)
                .attr("fill", "none")
                .attr("stroke", color[k])
                .attr("stroke-width", 2)
                .attr(
                    "d",
                    enrollmentLine
                        .defined((d) => d[k] != null)
                        .x((d) => x(d.year))
                        .y((d) => y(d[k])),
                );
        });
        title(svg, "Sub-Saharan Africa secondary enrollment, 1970–2018");
        d3.select("#white-hat-opt-1")
            .append("p")
            .attr("class", "note")
            .text(
                "Gross enrollment ratio: students enrolled in secondary school, regardless of age, " +
                    "÷ population of official secondary-school age. Can exceed 100%. Source: World Bank.",
            );
        svg.append("text")
            .attr("x", M.left)
            .attr("y", 36)
            .attr("font-size", 11)
            .attr("fill", "darkorange")
            .text("■ Girls");
        svg.append("text")
            .attr("x", M.left + 55)
            .attr("y", 36)
            .attr("font-size", 11)
            .attr("fill", "steelblue")
            .text("■ Boys");

        const rule = svg
            .append("line")
            .attr("y1", M.top)
            .attr("y2", H - M.bottom)
            .attr("stroke", "#999")
            .style("display", "none");
        const tooltip = d3
            .select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("display", "none");
        svg.append("rect")
            .attr("x", M.left)
            .attr("y", M.top)
            .attr("width", W - M.left - M.right)
            .attr("height", H - M.top - M.bottom)
            .attr("fill", "transparent")
            .on("mousemove", (event) => {
                const year = Math.round(x.invert(d3.pointer(event)[0]));
                const d = ssa.find((r) => r.year === year);
                if (!d) return;
                rule.attr("x1", x(year))
                    .attr("x2", x(year))
                    .style("display", null);
                tooltip
                    .style("display", null)
                    .style("left", `${event.pageX + 12}px`)
                    .style("top", `${event.pageY - 12}px`)
                    .html(
                        `<b>${year}</b><br>Girls: ${d.sec_f.toFixed(1)}%<br>Boys: ${d.sec_m.toFixed(1)}%<br>` +
                            `Gap: ${(d.sec_m - d.sec_f).toFixed(1)} pts (girls/boys ${(d.sec_f / d.sec_m).toFixed(2)})`,
                    );
            })
            .on("mouseleave", () => {
                rule.style("display", "none");
                tooltip.style("display", "none");
            });
    }
}).catch((error) => {
    const message = document.createElement("p");
    message.setAttribute("role", "alert");
    message.textContent = "The charts could not load. Please reload the page.";
    document.querySelector("main")?.prepend(message);
    console.error(error);
});
