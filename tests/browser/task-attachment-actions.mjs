import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';
import { fileURLToPath } from 'node:url';

test('任务附件上传后展示，并支持预览、下载和保存到项目文件库', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  try {
    await page.goto(origin + '/#/collab?evaProject=prod');
    await page.locator('.collab-frame').waitFor();
    await page.getByRole('tab', { name: '任务', exact: true }).click();
    await page.getByText('分析核心品类采购成本偏差', { exact: true }).click();

    const detail = page.locator('.loop-idp').last();
    await detail.waitFor();
    const seededCard = detail.locator('[data-eva-task-attachment="task-file-cost-variance-analysis"]');
    await seededCard.waitFor();
    assert.match(await seededCard.innerText(), /核心品类采购成本偏差\.csv[\s\S]*736 B/);
    assert.equal(await seededCard.locator('.wk-message-file-name').innerText(), '核心品类采购成本偏差.csv');
    assert.equal(await seededCard.locator('.wk-message-file-ext').innerText(), 'CSV');
    assert.equal(await seededCard.locator('[data-eva-file-type]').getAttribute('data-eva-file-type'), 'X');
    assert.match(await seededCard.getAttribute('class'), /wk-message-file/);
    const seededGeometry = await seededCard.evaluate(card => {
      const icon = card.querySelector('.wk-message-file-icon').getBoundingClientRect();
      const actions = [...card.querySelectorAll('.wk-message-file-action')].map(action => {
        const rect = action.getBoundingClientRect();
        const svg = action.querySelector('svg').getBoundingClientRect();
        return { width: rect.width, height: rect.height, iconWidth: svg.width, iconHeight: svg.height };
      });
      const rect = card.getBoundingClientRect();
      return { width: rect.width, height: rect.height, iconWidth: icon.width, iconHeight: icon.height, actions };
    });
    assert.deepEqual(seededGeometry, {
      width: 304,
      height: 64,
      iconWidth: 40,
      iconHeight: 40,
      actions: [
        { width: 44, height: 44, iconWidth: 18, iconHeight: 18 },
        { width: 44, height: 44, iconWidth: 18, iconHeight: 18 }
      ]
    });

    const previewButton = seededCard.getByRole('button', { name: '预览 核心品类采购成本偏差.csv', exact: true });
    await previewButton.click();
    const preview = detail.locator('.eva-task-file-preview-pane');
    await preview.waitFor();
    assert.equal(await preview.getByText('核心品类采购成本偏差.csv', { exact: true }).count(), 1);
    await page.keyboard.press('Escape');
    await preview.waitFor({ state: 'detached' });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      seededCard.getByRole('button', { name: '下载 核心品类采购成本偏差.csv', exact: true }).click()
    ]);
    assert.equal(download.suggestedFilename(), '核心品类采购成本偏差.csv');

    const uploadInput = detail.locator('.loop-idp__main input[type="file"]').first();
    assert.equal(await uploadInput.getAttribute('multiple'), '');
    await uploadInput.setInputFiles([
      {
        name: '采购成本补充说明.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('补充说明：芯片品类包含紧急空运费用。', 'utf8')
      },
      {
        name: '采购金额差异复核.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('xlsx-demo', 'utf8')
      },
      {
        name: '采购成本分析.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n% demo', 'utf8')
      }
    ]);
    const uploadedText = detail.locator('.eva-task-attachment-card').filter({ hasText: '采购成本补充说明.txt' });
    const uploadedSheet = detail.locator('.eva-task-attachment-card').filter({ hasText: '采购金额差异复核.xlsx' });
    const uploadedPdf = detail.locator('.eva-task-attachment-card').filter({ hasText: '采购成本分析.pdf' });
    await uploadedText.waitFor();
    await uploadedSheet.waitFor();
    await uploadedPdf.waitFor();
    assert.match(await uploadedText.innerText(), /采购成本补充说明\.txt[\s\S]*[0-9.]+ (?:B|KB)/);
    assert.equal(await uploadedText.locator('.wk-message-file-ext').innerText(), 'TXT');
    assert.equal(await uploadedText.locator('[data-eva-file-type]').getAttribute('data-eva-file-type'), 'TXT');
    assert.equal(await uploadedSheet.locator('[data-eva-file-type]').getAttribute('data-eva-file-type'), 'X');
    assert.equal(await uploadedPdf.locator('[data-eva-file-type]').getAttribute('data-eva-file-type'), 'PDF');

    await page.setViewportSize({ width: 1920, height: 1080 });
    const attachmentLayout = await detail.locator('.eva-task-attachments').evaluate(list => {
      const cards = [...list.querySelectorAll('.eva-task-attachment-card')].map(card => card.getBoundingClientRect());
      const title = list.parentElement.querySelector('.loop-idp__title')?.getBoundingClientRect();
      return {
        count: cards.length,
        lefts: cards.map(card => card.left),
        heights: cards.map(card => card.height),
        gaps: cards.slice(1).map((card, index) => card.top - cards[index].bottom),
        titleLeft: title?.left ?? null
      };
    });
    assert.equal(attachmentLayout.count, 4);
    assert.deepEqual([...new Set(attachmentLayout.lefts)], [attachmentLayout.titleLeft]);
    assert.deepEqual(attachmentLayout.heights, [64, 64, 64, 64]);
    assert.deepEqual(attachmentLayout.gaps, [4, 4, 4]);

    await seededCard.getByRole('button', { name: '保存到项目文件库', exact: true }).click();
    const openLibrary = seededCard.getByRole('button', { name: '前往项目文件库', exact: true });
    await openLibrary.waitFor();
    assert.doesNotMatch(await openLibrary.getAttribute('class'), /is-saved/);
    assert.equal(await openLibrary.getAttribute('aria-pressed'), null);
    const savedActionColor = await openLibrary.evaluate(button => getComputedStyle(button).color);
    const downloadActionColor = await seededCard.getByRole('button', { name: '下载 核心品类采购成本偏差.csv', exact: true }).evaluate(button => getComputedStyle(button).color);
    assert.equal(savedActionColor, downloadActionColor);
    await openLibrary.click();

    const files = page.locator('.eva-project-files');
    await files.waitFor();
    assert.equal(new URL(page.url()).hash, '#/collab?evaProject=prod&evaTab=files');
    assert.equal(await page.getByRole('tab', { name: '文件', exact: true }).getAttribute('aria-selected'), 'true');
    assert.equal(await files.getByText('核心品类采购成本偏差.csv', { exact: true }).count(), 1);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
