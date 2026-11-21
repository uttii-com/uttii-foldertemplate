<?php
/**
 * SPDX-FileCopyrightText: 2026 uttii-com <https://uttii.com>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
declare(strict_types=1);

return [
    'routes' => [
        ['name' => 'template#getTemplates', 'url' => '/api/templates', 'verb' => 'GET'],
        ['name' => 'template#createTemplate', 'url' => '/api/templates', 'verb' => 'POST'],
        ['name' => 'template#updateTemplate', 'url' => '/api/templates/{id}', 'verb' => 'PUT'],
        ['name' => 'template#deleteTemplate', 'url' => '/api/templates/{id}', 'verb' => 'DELETE'],
        ['name' => 'template#createFromTemplate', 'url' => '/api/create-from-template', 'verb' => 'POST'],
        ['name' => 'settings#setLanguage', 'url' => '/api/settings/language', 'verb' => 'POST'],
    ],
];
