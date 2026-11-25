<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidExpectedGraduation implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('Selecciona un mes y año válidos para la fecha estimada de egreso.');

            return;
        }

        $trimmed = trim($value);
        if (! preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $trimmed, $matches)) {
            $fail('La fecha estimada de egreso debe tener formato mes y año válidos (AAAA-MM).');

            return;
        }

        $now = now();
        $currentYm = $now->format('Y-m');
        if ($trimmed < $currentYm) {
            $fail('La fecha estimada de egreso no puede ser anterior al mes actual.');

            return;
        }

        $year = (int) $matches[1];
        $maxYear = $now->year + 12;
        if ($year > $maxYear) {
            $fail("El año estimado de egreso no puede superar {$maxYear}.");
        }
    }
}
