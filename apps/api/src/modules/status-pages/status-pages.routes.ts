import type { FastifyInstance } from 'fastify'
import {
  createStatusPageSchema,
  updateStatusPageSchema,
  statusPageIdSchema,
  statusPageSlugSchema,
  updateStatusPageLayoutSchema,
  updateStatusPageGroupsSchema,
  publicIncidentsQuerySchema,
} from './status-pages.schema.js'
import * as statusPagesService from './status-pages.service.js'
import { createTeamAuthHook } from '../../lib/team-auth.js'
import { env } from '../../config/env.js'

// ============================================
// Rotas de Status Pages - CRUD completo
// Atualizado para usar autenticação por time
// ============================================

export async function statusPagesRoutes(app: FastifyInstance) {
  // Hook para rotas de leitura (VIEWER)
  const viewerAuth = createTeamAuthHook('VIEWER')
  // Hook para rotas de escrita (EDITOR)
  const editorAuth = createTeamAuthHook('EDITOR')

  // POST /status-pages - Criar nova status page (requer EDITOR)
  app.post('/', { onRequest: [editorAuth] }, async (request, reply) => {
    const parseResult = createStatusPageSchema.safeParse(request.body)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Dados inválidos',
        details: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    // Verifica se o slug já existe
    const slugAvailable = await statusPagesService.checkSlugAvailable(parseResult.data.slug)
    if (!slugAvailable) {
      return reply.status(400).send({
        error: 'Este slug já está em uso',
      })
    }

    const statusPage = await statusPagesService.createStatusPage(
      request.teamContext!.teamId,
      parseResult.data
    )

    return reply.status(201).send(statusPage)
  })

  // GET /status-pages - Listar status pages do time (requer VIEWER)
  app.get('/', { onRequest: [viewerAuth] }, async (request, reply) => {
    const statusPages = await statusPagesService.findAllStatusPages(request.teamContext!.teamId)
    return reply.send({ statusPages })
  })

  // GET /status-pages/:id - Buscar status page por ID (requer VIEWER)
  app.get('/:id', { onRequest: [viewerAuth] }, async (request, reply) => {
    const parseResult = statusPageIdSchema.safeParse(request.params)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'ID inválido',
      })
    }

    const statusPage = await statusPagesService.findStatusPageById(
      request.teamContext!.teamId,
      parseResult.data.id
    )

    if (!statusPage) {
      return reply.status(404).send({
        error: 'Status page não encontrada',
      })
    }

    return reply.send(statusPage)
  })

  // PUT /status-pages/:id - Atualizar status page (requer EDITOR)
  app.put('/:id', { onRequest: [editorAuth] }, async (request, reply) => {
    const idResult = statusPageIdSchema.safeParse(request.params)

    if (!idResult.success) {
      return reply.status(400).send({
        error: 'ID inválido',
      })
    }

    const bodyResult = updateStatusPageSchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.status(400).send({
        error: 'Dados inválidos',
        details: bodyResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    // Se está atualizando o slug, verifica disponibilidade
    if (bodyResult.data.slug) {
      const slugAvailable = await statusPagesService.checkSlugAvailable(
        bodyResult.data.slug,
        idResult.data.id
      )
      if (!slugAvailable) {
        return reply.status(400).send({
          error: 'Este slug já está em uso',
        })
      }
    }

    const statusPage = await statusPagesService.updateStatusPage(
      request.teamContext!.teamId,
      idResult.data.id,
      bodyResult.data
    )

    if (!statusPage) {
      return reply.status(404).send({
        error: 'Status page não encontrada',
      })
    }

    return reply.send(statusPage)
  })

  // PUT /status-pages/:id/layout - Atualizar seções e monitors da status page (requer EDITOR)
  app.put('/:id/layout', { onRequest: [editorAuth] }, async (request, reply) => {
    const idResult = statusPageIdSchema.safeParse(request.params)

    if (!idResult.success) {
      return reply.status(400).send({
        error: 'ID inválido',
      })
    }

    const bodyResult = updateStatusPageLayoutSchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.status(400).send({
        error: 'Dados inválidos',
        details: bodyResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    try {
      const statusPage = await statusPagesService.updateStatusPageLayout(
        request.teamContext!.teamId,
        idResult.data.id,
        bodyResult.data
      )

      if (!statusPage) {
        return reply.status(404).send({
          error: 'Status page não encontrada',
        })
      }

      return reply.send(statusPage)
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Erro ao atualizar layout',
      })
    }
  })

  // GET /status-pages/check-slug/:slug - Verificar disponibilidade do slug (requer VIEWER)
  app.get('/check-slug/:slug', { onRequest: [viewerAuth] }, async (request, reply) => {
    const parseResult = statusPageSlugSchema.safeParse(request.params)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Slug inválido',
      })
    }

    const available = await statusPagesService.checkSlugAvailable(parseResult.data.slug)
    return reply.send({ available })
  })

  // DELETE /status-pages/:id - Deletar status page (requer EDITOR)
  app.delete('/:id', { onRequest: [editorAuth] }, async (request, reply) => {
    const parseResult = statusPageIdSchema.safeParse(request.params)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'ID inválido',
      })
    }

    const deleted = await statusPagesService.deleteStatusPage(
      request.teamContext!.teamId,
      parseResult.data.id
    )

    if (!deleted) {
      return reply.status(404).send({
        error: 'Status page não encontrada',
      })
    }

    return reply.status(204).send()
  })

  // GET /status-pages/:id/groups - Obter grupos da status page (requer VIEWER)
  app.get('/:id/groups', { onRequest: [viewerAuth] }, async (request, reply) => {
    const parseResult = statusPageIdSchema.safeParse(request.params)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'ID inválido',
      })
    }

    const groups = await statusPagesService.getStatusPageGroups(
      request.teamContext!.teamId,
      parseResult.data.id
    )

    if (groups === null) {
      return reply.status(404).send({
        error: 'Status page não encontrada',
      })
    }

    return reply.send({ groups })
  })

  // PUT /status-pages/:id/groups - Atualizar grupos da status page (requer EDITOR)
  app.put('/:id/groups', { onRequest: [editorAuth] }, async (request, reply) => {
    const idResult = statusPageIdSchema.safeParse(request.params)

    if (!idResult.success) {
      return reply.status(400).send({
        error: 'ID inválido',
      })
    }

    const bodyResult = updateStatusPageGroupsSchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.status(400).send({
        error: 'Dados inválidos',
        details: bodyResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    try {
      const statusPage = await statusPagesService.updateStatusPageGroups(
        request.teamContext!.teamId,
        idResult.data.id,
        bodyResult.data
      )

      if (!statusPage) {
        return reply.status(404).send({
          error: 'Status page não encontrada',
        })
      }

      return reply.send(statusPage)
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Erro ao atualizar grupos',
      })
    }
  })
}

// ============================================
// Rotas Públicas (sem autenticação)
// ============================================

export async function publicStatusPageRoutes(app: FastifyInstance) {
  // GET /public/status/:slug - Buscar status page pública
  app.get('/:slug', async (request, reply) => {
    const parseResult = statusPageSlugSchema.safeParse(request.params)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Slug inválido',
      })
    }

    const statusPage = await statusPagesService.getPublicStatusPage(parseResult.data.slug)

    if (!statusPage) {
      return reply.status(404).send({
        error: 'Status page não encontrada',
      })
    }

    return reply.send(statusPage)
  })

  // GET /public/status/:slug/incidents - Listar incidentes públicos
  app.get('/:slug/incidents', async (request, reply) => {
    const slugResult = statusPageSlugSchema.safeParse(request.params)

    if (!slugResult.success) {
      return reply.status(400).send({
        error: 'Slug inválido',
      })
    }

    const queryResult = publicIncidentsQuerySchema.safeParse(request.query)

    if (!queryResult.success) {
      return reply.status(400).send({
        error: 'Parâmetros inválidos',
        details: queryResult.error.errors,
      })
    }

    const result = await statusPagesService.getPublicIncidents(
      slugResult.data.slug,
      queryResult.data
    )

    if (!result) {
      return reply.status(404).send({
        error: 'Status page não encontrada',
      })
    }

    return reply.send(result)
  })

  // GET /public/status/:slug/maintenances - Listar manutenções públicas
  app.get('/:slug/maintenances', async (request, reply) => {
    const parseResult = statusPageSlugSchema.safeParse(request.params)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Slug inválido',
      })
    }

    const maintenances = await statusPagesService.getPublicMaintenances(parseResult.data.slug)

    if (maintenances === null) {
      return reply.status(404).send({
        error: 'Status page não encontrada',
      })
    }

    return reply.send({ maintenances })
  })

  // GET /public/status/:slug/widget - Dados mínimos para widget embed
  app.get('/:slug/widget', async (request, reply) => {
    const parseResult = statusPageSlugSchema.safeParse(request.params)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Slug inválido',
      })
    }

    const widgetData = await statusPagesService.getWidgetData(parseResult.data.slug)

    if (!widgetData) {
      return reply.status(404).send({
        error: 'Status page não encontrada',
      })
    }

    // Cache por 1 minuto
    reply.header('Cache-Control', 'public, max-age=60')

    return reply.send(widgetData)
  })

  // GET /public/status/:slug/widget.js - Script JavaScript do widget
  app.get('/:slug/widget.js', async (request, reply) => {
    const parseResult = statusPageSlugSchema.safeParse(request.params)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Slug inválido',
      })
    }

    const slug = parseResult.data.slug

    // Gera o script do widget
    const script = `
(function() {
  'use strict';

  // Configuração
  var API_URL = '${env.API_URL}';
  var SLUG = '${slug}';
  var REFRESH_INTERVAL = 60000; // 1 minuto

  // Cores por status
  var STATUS_COLORS = {
    operational: '#10b981',
    degraded: '#f59e0b',
    partial_outage: '#f59e0b',
    major_outage: '#ef4444'
  };

  var STATUS_LABELS = {
    operational: 'Operacional',
    degraded: 'Degradado',
    partial_outage: 'Parcialmente indisponível',
    major_outage: 'Indisponível'
  };

  // Encontra o container
  var containers = document.querySelectorAll('[data-taco-status="' + SLUG + '"]');
  if (containers.length === 0) return;

  function createWidget(container, data) {
    var size = container.getAttribute('data-taco-size') || 'default';
    var showLabel = container.getAttribute('data-taco-label') !== 'false';
    var statusUrl = container.getAttribute('data-taco-url') || (window.location.origin + '/status/' + SLUG);

    var color = STATUS_COLORS[data.status] || STATUS_COLORS.operational;
    var label = STATUS_LABELS[data.status] || 'Operacional';

    var html = '';

    if (size === 'badge') {
      // Mini badge
      html = '<a href="' + statusUrl + '" target="_blank" rel="noopener noreferrer" ' +
             'style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;' +
             'background:' + color + '20;border:1px solid ' + color + '40;border-radius:20px;' +
             'text-decoration:none;font-family:system-ui,-apple-system,sans-serif;font-size:12px;' +
             'color:' + color + ';font-weight:500;">' +
             '<span style="width:8px;height:8px;background:' + color + ';border-radius:50%;"></span>' +
             (showLabel ? label : '') +
             '</a>';
    } else if (size === 'compact') {
      // Compact widget
      html = '<a href="' + statusUrl + '" target="_blank" rel="noopener noreferrer" ' +
             'style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;' +
             'background:#18181b;border:1px solid #27272a;border-radius:8px;' +
             'text-decoration:none;font-family:system-ui,-apple-system,sans-serif;">' +
             '<span style="width:10px;height:10px;background:' + color + ';border-radius:50%;"></span>' +
             '<span style="color:#fff;font-size:14px;font-weight:500;">' + data.name + '</span>' +
             (showLabel ? '<span style="color:#71717a;font-size:12px;">' + label + '</span>' : '') +
             '</a>';
    } else {
      // Default widget
      html = '<a href="' + statusUrl + '" target="_blank" rel="noopener noreferrer" ' +
             'style="display:block;padding:16px;background:#18181b;border:1px solid #27272a;' +
             'border-radius:12px;text-decoration:none;font-family:system-ui,-apple-system,sans-serif;">' +
             '<div style="display:flex;align-items:center;justify-content:space-between;">' +
             '<div style="display:flex;align-items:center;gap:12px;">' +
             '<span style="width:12px;height:12px;background:' + color + ';border-radius:50%;"></span>' +
             '<span style="color:#fff;font-size:16px;font-weight:600;">' + data.name + '</span>' +
             '</div>' +
             '<span style="padding:4px 12px;background:' + color + '20;color:' + color + ';' +
             'border-radius:20px;font-size:13px;font-weight:500;">' + label + '</span>' +
             '</div>' +
             '<div style="margin-top:12px;display:flex;gap:16px;color:#71717a;font-size:13px;">' +
             '<span>' + data.monitorsUp + '/' + data.monitorsTotal + ' online</span>' +
             '<span>Atualizado: ' + new Date(data.updatedAt).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) + '</span>' +
             '</div>' +
             '</a>';
    }

    container.innerHTML = html;
  }

  function fetchStatus() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_URL + '/public/status/' + SLUG + '/widget', true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          containers.forEach(function(container) {
            createWidget(container, data);
          });
        } catch (e) {
          console.error('Taco Widget: Error parsing response', e);
        }
      }
    };
    xhr.send();
  }

  // Fetch inicial
  fetchStatus();

  // Atualiza a cada minuto
  setInterval(fetchStatus, REFRESH_INTERVAL);
})();
`.trim()

    reply.header('Content-Type', 'application/javascript')
    reply.header('Cache-Control', 'public, max-age=3600') // Cache 1 hora

    return reply.send(script)
  })
}
