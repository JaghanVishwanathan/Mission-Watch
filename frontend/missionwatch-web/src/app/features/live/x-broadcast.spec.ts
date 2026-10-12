import { TestBed } from '@angular/core/testing';
import { XBroadcast } from './x-broadcast';

describe('XBroadcast', () => {
  it("embeds X's official broadcast player for the configured ID", async () => {
    const fixture = TestBed.createComponent(XBroadcast);
    fixture.componentRef.setInput('broadcastId', '1yKAPwdemygxb');
    await fixture.whenStable();
    const iframe = (fixture.nativeElement as HTMLElement).querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe(
      'https://studio.x.com/embed/broadcast/1yKAPwdemygxb?dnt=true',
    );
    expect(iframe?.hasAttribute('allowfullscreen')).toBe(true);
  });

  it('renders nothing for an invalid ID', async () => {
    const fixture = TestBed.createComponent(XBroadcast);
    fixture.componentRef.setInput('broadcastId', 'bad id"><script>');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('iframe')).toBeNull();
  });
});
