export function formatContent(content) {
    // Convert markdown headers with minimal spacing
    content = content.replace(/###\s+([^\n]+)/g, '<h3 class="text-lg font-semibold mt-2 mb-1">$1</h3>');
    content = content.replace(/##\s+([^\n]+)/g, '<h2 class="text-xl font-semibold mt-2 mb-1">$1</h2>');
    content = content.replace(/#\s+([^\n]+)/g, '<h1 class="text-2xl font-bold mt-2 mb-1">$1</h1>');

    // Convert bold text
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert markdown-style tables to HTML tables with less padding
    content = content.replace(/\|\s*([^\n|]*\|)+\s*\n\s*\|[\s-:|]+\|\s*\n(\s*\|[^\n]+\|\s*\n?)+/g, function(table) {
        const rows = table.trim().split('\n');
        const headers = rows[0].split('|').filter(cell => cell.trim());
        const alignments = rows[1].split('|').filter(cell => cell.trim());
        const data = rows.slice(2).map(row => row.split('|').filter(cell => cell.trim()));
        
        let html = '<table class="w-full border-collapse my-2">';
        
        // Headers
        html += '<thead><tr>';
        headers.forEach(header => {
            html += `<th class="border px-2 py-1 bg-gray-50 text-sm">${header.trim()}</th>`;
        });
        html += '</tr></thead>';
        
        // Data rows
        html += '<tbody>';
        data.forEach(row => {
            html += '<tr>';
            row.forEach(cell => {
                html += `<td class="border px-2 py-1 text-sm">${cell.trim()}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        
        return html;
    });
    
    // Convert bullet points to proper HTML lists with minimal spacing
    let inList = false;
    content = content.split('\n').map(line => {
        line = line.trim();
        if (line.startsWith('-')) {
            if (!inList) {
                inList = true;
                return '<ul class="list-disc pl-4 mb-2">\n<li class="mb-0.5">' + line.substring(1).trim() + '</li>';
            }
            return '<li class="mb-0.5">' + line.substring(1).trim() + '</li>';
        } else if (inList && line) {
            inList = false;
            return '</ul>\n' + line;
        } else if (inList && !line) {
            inList = false;
            return '</ul>';
        }
        return line;
    }).join('\n');
    
    if (inList) {
        content += '</ul>';
    }

    // Add minimal spacing between sections
    content = content.replace(/<\/h3>/g, '</h3><div class="mb-1">');
    content = content.replace(/<h3/g, '</div><h3');
    
    // Wrap non-list text in paragraphs with minimal spacing
    content = content.replace(/^(?!<[uo]l|<li|<h[1-6]|<table|<\/div>)(.+)$/gm, '<p class="mb-1">$1</p>');
    
    // Clean up any empty paragraphs and extra spacing
    content = content.replace(/<p>\s*<\/p>/g, '');
    content = content.replace(/\n{3,}/g, '\n\n');
    
    return content;
}
