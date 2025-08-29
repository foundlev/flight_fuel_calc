const bindDefault = (i, c, d) => {
    const inp = document.getElementById(i),
        cb = document.getElementById(c);
    const s = () => {
        cb.checked ? inp.disabled = false : (inp.disabled = true, inp.value = d)
    };
    cb.addEventListener('change', s);
    s();
};
bindDefault('mtow', 'mtowOwn', 79015);
bindDefault('mldw', 'mldwOwn', 66360);


/* HH:MM mask */
const ttOldInput = document.getElementById('ttOld');
ttOldInput.addEventListener('input', e => {
    // оставляем только цифры и ограничиваем 4 символами
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    let formatted = null;

    if (v.length === 4) {
        // HHMM -> HH:MM
        let h = +v.slice(0, 2);
        let m = +v.slice(2, 4);
        h = h > 23 ? 23 : h;
        m = m > 59 ? 59 : m;
        formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    } else if (v.length === 3 && +v[0] > 2) {
        // HMM с первой цифрой > 2 -> 0H:MM (пример: 920 -> 09:20)
        let h = +v[0];           // 0..9
        let m = +v.slice(1, 3);  // 00..59
        m = m > 59 ? 59 : m;
        formatted = `0${h}:${String(m).padStart(2, '0')}`;
    }

    if (formatted) {
        e.target.value = formatted;
        e.target.parentElement.classList.toggle(
            'err',
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(formatted)
        );
    } else {
        // пока не настали условия автоформатирования — показываем «сырые» цифры
        e.target.value = v;
        e.target.parentElement.classList.remove('err');
    }
});

/* route helpers & wind button enable */
const routeTA = document.getElementById('route');
const windBtn = document.getElementById('windBtn');
const copyRoute = document.getElementById('copyRoute');
const requestRoutes = document.getElementById('requestRoutes');
const checkServerBtn = document.getElementById('checkServer');
const setNowDateBtn = document.getElementById('setNowDate');
const dtUtcInput = document.getElementById('dtUtc');

const routeDropdownSelect = document.getElementById('routeDropdown');

const icaoFromInput = document.getElementById('icaoFrom');
const icaoToInput = document.getElementById('icaoTo');
const icaoAltInput = document.getElementById('icaoAlt');

function setNowDateFunc() {
    const z = n => String(n).padStart(2, '0'),
        d = new Date(new Date().getTime() + 60 * 60 * 1000);
    dtUtcInput.value = `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}T${z(d.getUTCHours())}:${z(d.getUTCMinutes())}`
}

setNowDateFunc();

setNowDateBtn.addEventListener('click', () => {
    const originalHTML = setNowDateBtn.innerHTML;

    setNowDateFunc();
    chk();

    setNowDateBtn.innerHTML = `<i class="fa-solid fa-check"></i>`;
    setTimeout(() => {
        setNowDateBtn.innerHTML = originalHTML;
    }, 2000);
});

function routeDropdownFunc() {
    // routeDropdown.value;
    if (routeDropdownSelect.value !== 'no-item') {
        routeTA.value = routeDropdownSelect.options[routeDropdownSelect.selectedIndex].text;
    }
    chk();
}

routeDropdownSelect.addEventListener('change', routeDropdownFunc);

function chk() {
    windBtn.disabled = routeTA.value.trim().length < 5 || !getValue('payloadActual');
}

routeTA.addEventListener('input', chk);
document.getElementById('payloadActual').addEventListener('input', chk);
chk();

function copyRouteToUser() {
    let toHtml = `<i class="fa-solid fa-check"></i>`;
    if (routeTA) {
        navigator.clipboard.writeText(routeTA.value).then(() => {
            toHtml = `<i class="fa-solid fa-check"></i>`;
        }).catch(err => {
            toHtml = `<i class="fa-solid fa-xmark"></i>`;
        });
    } else {
        toHtml = `<i class="fa-solid fa-xmark"></i>`;
    }

    copyRoute.innerHTML = toHtml;
    setTimeout(() => {
        copyRoute.innerHTML = '<i class="fa-solid fa-copy"></i>';
    }, 2000);
}

copyRoute.addEventListener('click', copyRouteToUser);

windBtn.addEventListener('click', async () => {
    if (!icaoFromInput.value || !icaoToInput.value || !icaoAltInput.value) {
        alert('Нет аэродромов вылета, назначения или запасного');
        return;
    }

    const originalIcao = get_airport_icao(icaoFromInput.value);
    const destinationIcao = get_airport_icao(icaoToInput.value);
    const altIcao = get_airport_icao(icaoAltInput.value);

    if (!originalIcao || !destinationIcao || !altIcao) {
        alert('Нет аэродромов вылета и назначения или запасного');
        return;
    }

    const formattedDate = formatDateToCustomString(dtUtcInput.value);
    if (!formattedDate) {
        alert('Нет даты вылета');
        return;
    }

    const routeString = routeTA.value;
    if (!routeString) {
        alert('Нет маршрута рейса');
        return;
    }

    const payloadActual = getValue('payloadActual');
    if (!routeString) {
        alert('Не указан PAYLOAD');
        return;
    }

    const originalHTML = windBtn.innerHTML;
    windBtn.innerHTML = '<i class="fa-solid fa-tower-broadcast"></i>Проверяем сервер...';

    checkAuthSimbrief().then(authenticated => {
        if (authenticated) {
            windBtn.innerHTML = '<i class="fa-solid fa-spinner"></i> Получаем информацию...';

            calculateRoute(originalIcao, destinationIcao, altIcao, payloadActual, routeString, formattedDate).then(routeInfo => {

                // {avg_wind_comp: 25, route_distance: 1219, air_distance: 1147, trip_fuel: 6948, trip_time: "02:49:27", total_fob: 11537, alternate: "UNOO"}

                if (routeInfo) {
                    document.getElementById('avgWindCompLabel').textContent = `AVG W/C (${originalIcao} - ${destinationIcao}) GD: ${parseInt(routeInfo['route_distance'] || '0')}`;
                    document.getElementById('avgwcNew').value = parseInt(routeInfo['avg_wind_comp'] || '0');

                    setValue('adCalcSim', routeInfo['air_distance']);
                    setValue('tripFuelCalcSim', routeInfo['trip_fuel']);
                    setValue('tripTimeCalcSim', formatTimeColon(routeInfo['trip_time']));
                    setValue('f2CalcSim', routeInfo['total_fob']);

                    windBtn.innerHTML = `<i class="fa-solid fa-check"></i> Успешно загружено`;

                    setTimeout(() => {
                        windBtn.innerHTML = originalHTML;
                    }, 2000);
                } else {
                    windBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> Ошибка при загрузке`;

                    setTimeout(() => {
                        windBtn.innerHTML = originalHTML;
                    }, 2000);
                }
            });

        } else {
            windBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> Ошибка при загрузке`;

            setTimeout(() => {
                windBtn.innerHTML = originalHTML;
            }, 2000);
        }
    });

})

function checkServerFunc() {
    const originalHTML = checkServerBtn.innerHTML;

    checkServerBtn.innerHTML = '<i class="fa-solid fa-tower-broadcast"></i>Проверка...';

    checkAuthSimbrief().then(authenticated => {
        if (authenticated) {
            checkServerBtn.innerHTML = `<i class="fa-solid fa-check"></i> Успешно`;
        } else {
            checkServerBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> Ошибка`;
        }
    });

    setTimeout(() => {
        checkServerBtn.innerHTML = originalHTML;
    }, 2000);
}

checkServerBtn.addEventListener('click', checkServerFunc);

function requestRoutesFunc() {
    const original = icaoFromInput.value;
    const destination = icaoToInput.value;

    if (!original || !destination) {
        alert('Нет аэродромов вылета и назначения');
        return;
    }

    const originalIcao = get_airport_icao(original);
    const destinationIcao = get_airport_icao(destination);

    if (!originalIcao || !destinationIcao) {
        alert('Нет аэродромов вылета и назначения');
        return;
    }

    const originalHTML = requestRoutes.innerHTML;

    requestRoutes.innerHTML = '<i class="fa-solid fa-tower-broadcast"></i>';

    checkAuthSimbrief().then(authenticated => {
        if (authenticated) {
            requestRoutes.innerHTML = '<i class="fa-solid fa-spinner"></i>';

            getRoutes(originalIcao, destinationIcao).then(routes => {
                if (routes.length > 0) {
                    routeDropdownSelect.innerHTML = '';

                    routes.forEach(route => {
                        const option = document.createElement('option');
                        option.value = `route ${routes.indexOf(route)}`;
                        option.textContent = route;
                        routeDropdownSelect.appendChild(option);
                    });
                    routeDropdownFunc();

                    document.getElementById('routeLabel').textContent = `ROUTE (${originalIcao} - ${destinationIcao})`;

                    requestRoutes.innerHTML = `<i class="fa-solid fa-check"></i>`;

                    setTimeout(() => {
                        requestRoutes.innerHTML = originalHTML;
                    }, 2000);
                } else {
                    routeDropdownSelect.innerHTML = '<option value="no-item">Нет маршрутов</option>';
                    requestRoutes.innerHTML = `<i class="fa-solid fa-xmark"></i>`;

                    setTimeout(() => {
                        requestRoutes.innerHTML = originalHTML;
                    }, 2000);
                }
            });

        } else {
            requestRoutes.innerHTML = `<i class="fa-solid fa-xmark"></i>`;

            setTimeout(() => {
                requestRoutes.innerHTML = originalHTML;
            }, 2000);
        }
    });
}

requestRoutes.addEventListener('click', requestRoutesFunc);

clrR.onclick = () => {
    routeTA.value = '';
    chk();
};

/* range validation */
document.querySelectorAll('input[type=number]').forEach(inp => inp.addEventListener('input', () => {
    const v = +inp.value;
    inp.parentElement.classList.toggle('err', !(inp.value === '' || v >= +inp.min && v <= +inp.max));
}));

/* ICAO 4-letter */
['icaoFrom', 'icaoTo', 'icaoAlt'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => el.parentElement.classList.toggle('err', !/^[A-Za-z]{3,4}$/.test(el.value)));
});

document.getElementById('calcBtn').addEventListener('click', calculate);

function setValue(id, v) {
    const el = document.getElementById(id);
    el.value = v;
    el.parentElement.classList.toggle('err', false);
}

function getValue(id) {
    return document.getElementById(id).value;
}

function formatDateToCustomString(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()} - ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function extractPoints(route) {
    const points = route.trim().split(/\s+/);
    if (points.length < 2) return null;
    return {
        origin: points[0].toUpperCase(),
        destination: points[points.length - 1].toUpperCase()
    };
}

function goRound(value, precision = 10, toFloor = false) {
    if (toFloor) {
        return Math.floor(value / precision) * precision
    }
    return Math.ceil(value / precision) * precision
}

function calculate() {
    const calcBtn = document.getElementById('calcBtn');
    calcBtn.disabled = true;

    // собираем данные
    const data = {
        acNum: acnum.value,
        icaoFrom: (icaoFrom.value || '').toUpperCase(),
        icaoTo: (icaoTo.value || '').toUpperCase(),
        payloadActual: parseInt(payloadActual.value || 0),
        mtow: parseInt(mtow.value || 79015),
        mldw: parseInt(mldw.value || 66360),
        ad: parseInt(ad.value || 0),
        tripFuel: parseInt(tripFuelOld.value || 0),
        totalFuel: parseInt(totalFuelOld.value || 0),
        tripTimeMin: (() => { // HH:MM → минуты
            const [h, m] = ttOldInput.value.split(':').map(Number);
            return h * 60 + m;
        })(),
        avgwcOld: parseInt(avgwcOld.value || 0),
        acnumOld: acnumOld.value,
        eldwOld: parseInt(eldwOld.value || 0),
        payloadOld: parseInt(payloadOld.value || 0),
        route: route.value || '',
        etdUtc: dtUtc.value,
        avgwcNew: parseInt(avgwcNew.value || 0)
    };

    const totalCalc = 7;
    let doneCalc = 0;

    if (data.payloadActual) {
        setValue('payloadActualDub', data.payloadActual);
        doneCalc += 1;
    }

    let dow = null;
    let doi = null;
    let maxPayloadForMZFW = null;

    if (data.acNum) {
        dow = parseInt(weights[data.acNum].dow || '44_500');
        doi = weights[data.acNum].doi;

        setValue('dow', dow);
        setValue('doi', doi);
        setValue('accNumDub', data.acNum);

        maxPayloadForMZFW = goRound(61_688 - dow, 100, true);
        setValue('payloadMaxMZFW', maxPayloadForMZFW);

        doneCalc += 1;
    }

    if (data.acNum && data.payloadActual) {
        const ezfw = parseInt(data.payloadActual) + dow;

        setValue('ezfw', ezfw);

        doneCalc += 1;
    }

    let iataFrom = null;
    let iataTo = null;

    if (data.icaoFrom && data.icaoTo) {
        iataFrom = get_airport_iata(data.icaoFrom);
        iataTo = get_airport_iata(data.icaoTo);
    }

    if (iataFrom && iataTo) {
        const typeFuelOptions = {
            'ABA': 14200,
            'AUH': 16100,
            'COV': 15400,
            'SCO': 10700,
            'AKX': 8300,
            'ALA': 13700,
            'AYT': 17400,
            'KVK': 8200,
            'ARH': 8100,
            'NQZ': 10600,
            'ASF': 9900,
            'GUW': 9000,
            'GYD': 11000,
            'BAX': 12200,
            'FRU': 12900,
            'BJV': 16300,
            'BHK': 11700,
            'OGZ': 11600,
            'VOG': 8600,
            'RGK': 13200,
            'GRV': 11200,
            'LWN': 9100,
            'GNJ': 11000,
            'DLM': 16200,
            'DEL': 18800,
            'DOH': 16800,
            'DXB': 16500,
            'DWC': 16300,
            'SVX': 7900,
            'EVN': 12700,
            'IJK': 6900,
            'ADB': 16300,
            'IKT': 17000,
            'IKU': 13300,
            'KZN': 6000,
            'CAI': 17800,
            'KGD': 11400,
            'KGF': 11300,
            'KEJ': 12700,
            'KSN': 9300,
            'KJA': 14400,
            'KZO': 11600,
            'MQF': 8400,
            'MCX': 10600,
            'MRV': 11700,
            'MSQ': 7700,
            'MMK': 9600,
            'GOJ': 5200,
            'IGT': 11300,
            'NAL': 10600,
            'NJC': 10700,
            'NBC': 6300,
            'NOZ': 12800,
            'OVB': 12300,
            'NUX': 11100,
            'OMS': 11700,
            'REN': 8100,
            'OSW': 8700,
            'OSS': 13700,
            'PEZ': 5500,
            'PEE': 7400,
            'LED': 6800,
            'KUF': 6400,
            'SKD': 12000,
            'SKX': 6200,
            'GSV': 6700,
            'AER': 12100,
            'STW': 11000,
            'IST': 17300,
            'SGC': 9800,
            'SCW': 7500,
            'TAS': 13000,
            'IKA': 13900,
            'TOF': 12700,
            'TJM': 9500,
            'UBN': 18600,
            'UUD': 17300,
            'ULV': 5600,
            'UGC': 11100,
            'UFA': 7800,
            'FEG': 12900,
            'HMA': 9200,
            'HRG': 19000,
            'CSY': 5600,
            'CEK': 8100,
            'SSH': 19000,
            'CIT': 12100,
            'YKS': 20100,
            'ESL': 11900
        }

        if (iataFrom === 'SVO') {
            setValue('fTypeCalc', typeFuelOptions[iataTo])
            doneCalc += 1;
        } else if (iataTo === 'SVO') {
            setValue('fTypeCalc', typeFuelOptions[iataFrom])
            doneCalc += 1;
        } else {
            setValue('fTypeCalc', 'UNKNOWN')
        }
    }

    const velocity = 420
    let tripFuelNew = null;
    if (data.tripFuel && data.tripTimeMin && data.avgwcOld && data.avgwcNew && data.ad) {
        const tripTimeMinNew = ((velocity + data.avgwcOld) * data.tripTimeMin) / (velocity + data.avgwcNew)

        const h = Math.floor(tripTimeMinNew / 60);
        const m = Math.round(tripTimeMinNew % 60);
        setValue('tripTimeCalc', `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

        tripFuelNew = goRound(data.tripFuel * (tripTimeMinNew / data.tripTimeMin));
        setValue('tripFuelCalc', tripFuelNew);

        const newAd = goRound(data.ad * (tripTimeMinNew / data.tripTimeMin));
        setValue('adCalc', newAd);

        const fAD = goRound(newAd * 6 + 3000);
        setValue('fADCalc', fAD);

        doneCalc += 1;
    }

    let f2 = null;
    if (tripFuelNew && data.totalFuel && data.tripFuel) {
        f2 = goRound(data.totalFuel - data.tripFuel + tripFuelNew);
        setValue('f2Calc', f2);

        doneCalc += 1;
    }

    let FmaxLDG = null;
    if (data.mtow && data.mldw && dow && data.payloadActual && data.payloadOld && data.eldwOld && f2) {
        const FmaxTO = data.mtow - (data.payloadActual + dow);

        let extraPerDow = 0;
        if (data.acnumOld) {
            const dowOld = parseInt(weights[data.acnumOld].dow || '43_000');
            extraPerDow = dowOld - dow;
        }
        FmaxLDG = data.mldw - data.eldwOld + (data.payloadOld - data.payloadActual) + f2 + extraPerDow;

        setValue('FmaxTO', FmaxTO);
        setValue('FmaxLDG', FmaxLDG);
        setValue('FmaxTanks', '20400');

        doneCalc += 1;
    }

    const fobRecalcSFP = parseInt(getValue('f2Calc')) || 0;
    const fobSimbriefCalc = parseInt(getValue('f2CalcSim')) || 0;
    const fobTypeTable = parseInt(getValue('fTypeCalc')) || 0;
    const fobAdCalc = parseInt(getValue('fADCalc')) || 0;

    // Получаем максимальный FOB.
    const maxFOB = Math.max(fobRecalcSFP, fobSimbriefCalc, fobTypeTable, fobAdCalc);

    const fobMaxTO = parseInt(getValue('FmaxTO')) || 999_999;
    const fobMaxLDG = parseInt(getValue('FmaxLDG')) || 999_999;
    const fobMaxTanks = parseInt(getValue('FmaxTanks')) || 20_400;

    const minMaxFOB = Math.min(fobMaxTO, fobMaxLDG, fobMaxTanks);
    setValue('FmaxUsable', minMaxFOB);

    let recFob = null;
    let recComment = '';
    let recStyle = '';

    if (maxFOB <= minMaxFOB) {
        recFob = maxFOB;
        const posExtraFuel = minMaxFOB - maxFOB;
        const symbol = posExtraFuel <= 1_000 ? '⚠️' : '';
        recComment = `${symbol} Рекомендуемый (запас ~${formatNumberThousands(goRound(posExtraFuel, 100, true))} кг)`;
    } else {
        recFob = minMaxFOB;
        recComment = '⚠️ Рекомендуемый (ограничен по minMaxFOB)';
    }

    setValue('fSuperTotal', formatNumberThousands(goRound(recFob, 100, true)) + ' кг');
    document.getElementById('recFobLabel').textContent = recComment;

    let maxPayloadForMTOW = null;
    if (data.mtow && dow && data.payloadActual) {
        maxPayloadForMTOW = data.mtow - recFob - dow;
        setValue('payloadMaxMTOW', goRound(maxPayloadForMTOW, 100, true));
    }

    // FmaxLDG = data.mldw - data.eldwOld + (data.payloadOld - data.payloadActual) + f2 + extraPerDow;
    let maxPayloadForMLDW;
    if (FmaxLDG && data.payloadActual) {
        const potentialExtraPayload = FmaxLDG - recFob;
        maxPayloadForMLDW = data.payloadActual + potentialExtraPayload;
        setValue('payloadMaxMLDW', goRound(maxPayloadForMLDW, 100, true));
    }

    let maxPayloadUsable = null;
    if (maxPayloadForMZFW && maxPayloadForMTOW && maxPayloadForMLDW) {
        maxPayloadUsable = Math.min(maxPayloadForMLDW, maxPayloadForMTOW, maxPayloadForMLDW);
        setValue('payloadMaxUsable', goRound(maxPayloadUsable, 100, true));
    }

    const originalHTML = calcBtn.innerHTML;

    calcBtn.innerHTML = `<i class="fa-solid fa-check"></i> Заполнено: ${doneCalc} из ${totalCalc}`;
    setTimeout(() => {
        calcBtn.innerHTML = originalHTML;
        calcBtn.disabled = false;
    }, 2000);

}