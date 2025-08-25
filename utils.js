function get_airport_icao(airport_code) {
    if (airport_code.length === 4) {
        return airport_code;
    } else if (airport_code.length === 3) {
        const airport = airports_db.find(a => a.iata === airport_code);
        return airport ? airport.icao : null;
    }
    return null;
}

function get_airport_iata(airport_code) {
    if (airport_code.length === 3) {
        return airport_code;
    } else if (airport_code.length === 4) {
        const airport = airports_db.find(a => a.icao === airport_code);
        return airport ? airport.iata : null;
    }
    return null;
}

async function checkAuthSimbrief() {
    if (NO_WLAN) {
        return true;
    }

    try {
        const response = await fetch("https://devcommonhub.ru/api/auth_simbrief", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            const result = await response.json();
            return result === true;
        }

        console.error(`auth_simbrief failed with status: ${response.status}`);
    } catch (error) {
        console.error("auth_simbrief failed:", error);
    }

    return false;
}

async function getRoutes(origin, destination) {
    if (NO_WLAN) {
        return [
            "ANIKI G484 HMN L870 UNISO N155 AMEGO P65 ROMTA",
            "ANIKI G484 HMN L870 UNISO N155 BALOB T760 LUMAK T289 MATUB T187 ROMTA",
            "ANIKI G484 HMN L870 UNISO N869 BAPUN N181 OSNOL T289 MATUB T187 ROMTA"
        ]
    }

    try {
        const response = await fetch(`https://devcommonhub.ru/api/routes/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`routes/search failed: ${await response.text()}`);
        }

        const routes = await response.json();

        return (routes || []);

    } catch (error) {
        console.error(error.message);
        return [];
    }
}

async function calculateRoute(origin, destination, alternate, payloadActual, route_string, date_string) {
    if (NO_WLAN) {
        return {
            "avg_wind_comp": -12.3,
            "route_distance": 1171.13,
            "air_distance": 1152.66,
            "trip_fuel": 5400.0,
            "alternate": "UUWW"
        };
    }

    const url = "https://devcommonhub.ru/api/plan/calculate";
    const headers = {"Content-Type": "application/json"};

    const payload = {
        origin: origin,
        destination: destination,
        alternate: alternate,
        payload: payloadActual,
        route: route_string,
        date: date_string
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            return await response.json();
        } else if (response.status === 400) {
            console.error("Error 400: alternate not specified and use_nearest_alt=false.");
        } else if (response.status === 502) {
            console.error("Error 502: Unexpected SimBrief response shape.");
        } else if (response.status === 500) {
            console.error("Error 500: plan/calculate failed.");
        }
    } catch (error) {
        console.error("Network or unexpected error:", error);
    }

    return null;
}

function getValue(elementId) {
    return document.getElementById(elementId).value;
}

function setValue(elementId, newValue) {
    document.getElementById(elementId).value = newValue;
}

function formatTimeColon(input) {
    const parts = input.split(":");
    return parts.slice(0, 2).join(":");
}


function setInnerHtml(elementId, newInnerHTML, pauseBefore = 0) {
    const element = document.getElementById(elementId);
    const originalHTML = element.innerHTML;

    if (pauseBefore > 0) {
        setTimeout(() => {
            element.innerHTML = newInnerHTML;
        }, pauseBefore);
    } else {
        element.innerHTML = newInnerHTML;
    }

    return originalHTML;
}


function formatNumberThousands(input) {
    if (typeof input === 'number' || (typeof input === 'string' && !isNaN(input))) {
        return input.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
    return input;
}
