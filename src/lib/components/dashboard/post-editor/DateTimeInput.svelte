<script lang="ts">
	import { CalendarDaysIcon } from 'lucide-svelte';

	type DateData = {
		year: number;
		month: number;
		day: number;
		hour: number;
		minute: number;
	};

	let {
		date = $bindable(),
		minDate,
		maxDate,
		onValidityChanged
	}: {
		date: DateData;
		minDate?: DateData;
		maxDate?: DateData;
		onValidityChanged?: (valid: boolean) => void;
	} = $props();

	function compareDateData(a: DateData, b: DateData) {
		return (
			a.year - b.year ||
			a.month - b.month ||
			a.day - b.day ||
			a.hour - b.hour ||
			a.minute - b.minute
		);
	}

	function toJsDate(date: {
		year: number;
		month: number;
		day: number;
		hour: number;
		minute: number;
	}) {
		return new Date(date.year, date.month - 1, date.day, date.hour, date.minute);
	}

	const jsDate = $derived(toJsDate(date));

	function getTimeZoneNameComponent(
		date: Date,
		locale: string,
		component: Intl.DateTimeFormatOptions['timeZoneName']
	) {
		const dateStringWithoutTimeZone = date.toLocaleDateString(locale);
		const dateStringWithTimeZone = date.toLocaleDateString(locale, { timeZoneName: component });

		const indexOfDateInDateStringWithTimeZone =
			dateStringWithTimeZone.indexOf(dateStringWithoutTimeZone);
		const dateStringWithTimeZoneWithoutDate =
			dateStringWithTimeZone.substring(0, indexOfDateInDateStringWithTimeZone) +
			dateStringWithTimeZone.substring(
				indexOfDateInDateStringWithTimeZone + dateStringWithoutTimeZone.length
			);

		// Remove whitespace and punctuation from beginning and end of string
		const timeZoneNameRegex = /^[\s\p{P}]*(.*?)[\s\p{P}]*$/u;
		const timeZoneName = dateStringWithTimeZoneWithoutDate.match(timeZoneNameRegex)?.[1];

		if (timeZoneName) return timeZoneName;

		return dateStringWithTimeZoneWithoutDate;
	}

	const timeZoneName = $derived.by(() => {
		const locale = 'en';
		const name = getTimeZoneNameComponent(jsDate, locale, 'long');
		const offset = getTimeZoneNameComponent(jsDate, locale, 'longOffset');

		if (name !== offset) return `${name} (${offset})`;
		return offset;
	});

	let monthInput: HTMLSelectElement;
	let dayInput: HTMLInputElement;
	let yearInput: HTMLInputElement;
	let calendarDateInput: HTMLInputElement;

	let hourInput: HTMLInputElement;
	let minuteInput: HTMLInputElement;
	let meridiemInput: HTMLSelectElement;

	let invalidReasons = $state<string[]>([]);

	function toInt(
		string: string,
		min = Number.MIN_SAFE_INTEGER,
		max = Number.MAX_SAFE_INTEGER
	): { ok: false } | { ok: true; value: number } {
		if (string.trim() === '') return { ok: false };

		const n = Number(string);
		if (isNaN(n) || !Number.isInteger(n) || n < min || n > max) return { ok: false };

		return { ok: true, value: n };
	}

	function validateInputs(event?: Event): { valid: false } | { valid: true; date: typeof date } {
		const year = toInt(yearInput.value, 1, 9999);
		const month = toInt(monthInput.value, 1, 12);
		const daysInMonth = new Date(date.year, date.month, 0).getDate();
		const day = toInt(dayInput.value, 1, daysInMonth);
		const hour = toInt(hourInput.value, 0, 24);
		const minute = toInt(minuteInput.value, 0, 59);
		const meridiem = meridiemInput.value as 'am' | 'pm';

		if (hour.ok) {
			if (hour.value === 24 && month.ok && day.ok && year.ok && minute.ok) {
				if (minute.value === 0) {
					hour.value = 0;
					day.value += 1;
					if (day.value > daysInMonth) {
						day.value = 1;
						month.value += 1;
						if (month.value > 12) {
							month.value = 1;
							year.value += 1;
							if (year.value > 9999) {
								(hour as { ok: boolean }).ok = false;
							}
						}
					}
				} else {
					(hour as { ok: boolean }).ok = false;
				}
			} else if (event?.currentTarget === meridiemInput) {
				if (meridiem === 'pm' && hour.value < 12) {
					hour.value += 12;
				} else if (meridiem === 'am' && hour.value >= 12) {
					hour.value -= 12;
				}
			} else {
				if (meridiem === 'pm' && hour.value > 0 && hour.value < 12) {
					hour.value += 12;
				} else if (meridiem === 'am' && hour.value === 12) {
					hour.value = 0;
				}
			}
		}

		yearInput.setCustomValidity(year.ok ? '' : 'Invalid year');
		monthInput.setCustomValidity(month.ok ? '' : 'Invalid month');
		dayInput.setCustomValidity(day.ok ? '' : 'Invalid day');
		hourInput.setCustomValidity(hour.ok ? '' : 'Invalid hour');
		minuteInput.setCustomValidity(minute.ok ? '' : 'Invalid minute');

		invalidReasons = [monthInput, dayInput, yearInput, hourInput, minuteInput]
			.map((input) => input.validationMessage)
			.filter(Boolean);

		if (!year.ok || !month.ok || !day.ok || !hour.ok || !minute.ok) {
			return { valid: false };
		}

		const inputDateData = {
			year: year.value,
			month: month.value,
			day: day.value,
			hour: hour.value,
			minute: minute.value
		};

		if (minDate && compareDateData(inputDateData, minDate) < 0) {
			invalidReasons.push('Scheduled date is too soon');
			return { valid: false };
		}

		if (maxDate && compareDateData(inputDateData, maxDate) > 0) {
			invalidReasons.push('Scheduled date is too far in the future');
			return { valid: false };
		}

		return {
			valid: true,
			date: inputDateData
		};
	}

	function onFinishedInput(event?: Event) {
		const result = validateInputs(event);
		if (result.valid) date = result.date;
		onValidityChanged?.(result.valid);
	}

	$effect(() => {
		monthInput.value = date.month.toString();
		dayInput.value = date.day.toString();
		yearInput.value = date.year.toString();
		hourInput.value = String(date.hour === 0 ? 12 : date.hour > 12 ? date.hour - 12 : date.hour);
		minuteInput.value = date.minute.toString().padStart(2, '0');
		meridiemInput.value = date.hour < 12 ? 'am' : 'pm';
	});

	$effect(() => {
		onValidityChanged?.(validateInputs().valid);
	});
</script>

<div class="contents show-invalid">
	<div class="date-settings">
		<label>
			Month
			<select bind:this={monthInput} onchange={onFinishedInput}>
				{#each { length: 12 } as _, i}
					<option value={i + 1}>
						{new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(date.year, i))}
					</option>
				{/each}
			</select>
		</label>

		<label>
			Day
			<input
				type="text"
				inputmode="numeric"
				bind:this={dayInput}
				oninput={validateInputs}
				onchange={onFinishedInput}
			/>
		</label>

		<label>
			Year
			<input
				type="text"
				inputmode="numeric"
				bind:this={yearInput}
				oninput={validateInputs}
				onchange={onFinishedInput}
			/>
		</label>

		<div class="calendar">
			<button
				type="button"
				class="ghost"
				title="Open Calendar"
				onclick={() => {
					const dateToShow = new Date(jsDate);
					dateToShow.setHours(0, 0, 0, 0);
					calendarDateInput.valueAsDate = dateToShow;

					if (minDate) {
						calendarDateInput.min = `${minDate.year}-${minDate.month.toString().padStart(2, '0')}-${minDate.day.toString().padStart(2, '0')}`;
					} else {
						calendarDateInput.min = '';
					}

					if (maxDate) {
						calendarDateInput.max = `${maxDate.year}-${maxDate.month.toString().padStart(2, '0')}-${maxDate.day.toString().padStart(2, '0')}`;
					} else {
						calendarDateInput.max = '';
					}

					calendarDateInput.showPicker();
				}}
			>
				<CalendarDaysIcon />
			</button>
			<input
				type="date"
				bind:this={calendarDateInput}
				onchange={(e) => {
					const selectedDate = e.currentTarget.valueAsDate;
					if (!selectedDate) return;

					date = {
						...date,
						year: selectedDate.getUTCFullYear(),
						month: selectedDate.getUTCMonth() + 1,
						day: selectedDate.getUTCDate()
					};
				}}
			/>
		</div>
	</div>

	<div class="time-settings">
		<label>
			Hour
			<input
				type="text"
				inputmode="numeric"
				bind:this={hourInput}
				oninput={validateInputs}
				onchange={onFinishedInput}
			/>
		</label>

		<label>
			Minute
			<input
				type="text"
				inputmode="numeric"
				bind:this={minuteInput}
				oninput={validateInputs}
				onchange={onFinishedInput}
			/>
		</label>

		<label>
			AM/PM
			<select bind:this={meridiemInput} onchange={onFinishedInput}>
				<option value="am">AM</option>
				<option value="pm">PM</option>
			</select>
		</label>
	</div>

	<div class="time-zone-settings">
		<b>Time Zone:</b>
		{timeZoneName}
	</div>

	{#if invalidReasons.length > 0}
		<ul class="errors">
			{#each invalidReasons as reason}
				<li>{reason}</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.contents {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.date-settings,
	.time-settings {
		flex: 1;
		display: flex;
		flex-direction: row;
		justify-content: start;
		align-items: end;
		gap: 0.5rem;

		label {
			display: flex;
			flex-direction: column;
			gap: 0.25rem;

			input,
			select {
				width: 8rem;
			}
		}
	}

	.calendar {
		position: relative;

		input[type='date'] {
			position: absolute;
			top: 0;
			left: 0;
			width: 0;
			height: 0;
			opacity: 0;
			pointer-events: none;
		}
	}

	.errors {
		color: var(--error-color);
	}
</style>
